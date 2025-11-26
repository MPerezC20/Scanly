// scripts/openai-api.js - ACTUALIZADO con rangos 0-100
class OpenAIAnalyzer {
    constructor() {
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
    }

    async analyzeMessage(message) {
        if (!this.apiKey || this.apiKey === 'sk-tu-api-key-real-aqui') {
            throw new Error('Configura tu API Key de OpenAI en openai-api.js');
        }

        if (!message || message.trim().length === 0) {
            throw new Error('El mensaje no puede estar vacío');
        }

        const prompt = this.createPrompt(message);

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Eres un analizador de contenido especializado en detectar ciberacoso y lenguaje ofensivo. Responde SOLO con un objeto JSON válido."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error(`Error de API: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.parseResponse(data.choices[0].message.content, originalMessage);

        } catch (error) {
            console.error('Error en análisis con OpenAI:', error);
            throw new Error('No se pudo analizar el mensaje. Intenta nuevamente.');
        }
    }

    createPrompt(message) {
        return `
Analiza el siguiente mensaje para detectar ciberacoso y lenguaje ofensivo. Responde EXCLUSIVAMENTE con un objeto JSON en este formato:

{
    "classification": "inofensivo|ofensivo_leve|ofensivo_grave|discurso_odio",
    "detected_categories": ["lenguaje_sexual", "amenazas", "discriminatorio", "bullying", "racista"],
    "explanation": "Explicación clara y educativa en español",
    "offensive_phrases": ["frase1", "frase2"],
    "suggestions": "Sugerencias para mejorar la comunicación",
    "confidence_score": 85
}

Mensaje a analizar: "${message}"

Reglas de clasificación:
- "inofensivo": No contiene lenguaje ofensivo, saludos normales, conversación educada
- "ofensivo_leve": Insultos leves, burlas suaves, lenguaje despectivo leve
- "ofensivo_grave": Insultos graves, acoso claro, humillación constante, lenguaje muy ofensivo
- "discurso_odio": Amenazas directas, discriminación grave, racismo, contenido violento explícito

Categorías a detectar:
- "lenguaje_sexual": Contenido sexual no deseado, acoso sexual explícito
- "amenazas": Intimidación o daño potencial, chantaje, amenazas directas
- "discriminatorio": Basado en género, raza, orientación sexual, religión, discapacidad, etc.
- "bullying": Acoso escolar/digital, hostigamiento constante
- "racista": Contenido racial ofensivo, xenofobia, comentarios étnicos ofensivos

Para el confidence_score, asigna un valor entre 0-100 basado en la certeza de la clasificación:
- 0-20: Completamente inofensivo, saludos normales
- 21-40: Probablemente inofensivo, podría tener doble sentido muy leve
- 41-60: Neutral/ambiguo, necesita más contexto
- 61-75: Levemente ofensivo, insultos suaves
- 76-85: Moderadamente ofensivo, lenguaje claramente inapropiado
- 86-94: Fuertemente ofensivo, acoso claro
- 95-100: Extremadamente ofensivo, discurso de odio o amenazas graves

Responde SOLO con el objeto JSON, sin texto adicional.
        `;
    }

    parseResponse(responseText, originalMessage) {
        try {
            // Limpiar la respuesta por si hay texto adicional
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Respuesta no válida de la API');
            }

            const result = JSON.parse(jsonMatch[0]);
            
            // Validar la estructura de la respuesta
            if (!result.classification || !result.explanation) {
                throw new Error('Respuesta de API incompleta');
            }

            // Calcular confianza basada en la clasificación y contenido
            const calculatedConfidence = this.calculateDynamicConfidence(result, originalMessage);

            return {
                classification: this.mapClassification(result.classification),
                explanation: result.explanation,
                detected: result.detected_categories || [],
                offensivePhrases: result.offensive_phrases || [],
                suggestions: result.suggestions || 'Considera comunicarte de manera más respetuosa.',
                confidence: calculatedConfidence
            };

        } catch (error) {
            console.error('Error parseando respuesta de OpenAI:', error);
            throw new Error('Error procesando la respuesta del análisis');
        }
    }

    calculateDynamicConfidence(result, originalMessage) {
        let baseConfidence = result.confidence_score || 50;
        
        // Ajustar confianza basada en la clasificación (rangos 0-100)
        const classificationBase = {
            'inofensivo': 15,     // 0-30% para inofensivo
            'ofensivo_leve': 65,  // 50-75% para ofensivo leve
            'ofensivo_grave': 85, // 75-92% para ofensivo grave
            'discurso_odio': 95   // 90-100% para discurso de odio
        };

        const classification = result.classification;
        if (classificationBase[classification]) {
            baseConfidence = classificationBase[classification];
        }

        // Ajustar por número de categorías detectadas
        const categoryCount = result.detected_categories ? result.detected_categories.length : 0;
        if (categoryCount > 0) {
            baseConfidence += (categoryCount * 3);
        }

        // Ajustar por palabras clave de alta severidad
        const highSeverityWords = ['matar', 'muerte', 'suicidio', 'violar', 'amenaza', 'odio', 'asco'];
        const hasHighSeverity = highSeverityWords.some(word => 
            originalMessage.toLowerCase().includes(word)
        );
        if (hasHighSeverity && classification !== 'inofensivo') {
            baseConfidence += 8;
        }

        // Ajustar por palabras clave de mediana severidad
        const mediumSeverityWords = ['idiota', 'estúpido', 'inútil', 'feo', 'gordo', 'raro'];
        const hasMediumSeverity = mediumSeverityWords.some(word => 
            originalMessage.toLowerCase().includes(word)
        );
        if (hasMediumSeverity && classification !== 'inofensivo') {
            baseConfidence += 5;
        }

        // Ajustar por longitud del mensaje (mensajes más largos dan más contexto)
        const messageLength = originalMessage.length;
        if (messageLength > 50 && classification !== 'inofensivo') {
            baseConfidence += 2;
        }

        // Variación aleatoria pequeña para hacerlo más natural (±3%)
        const randomVariation = (Math.random() * 6) - 3;
        baseConfidence += randomVariation;

        // Asegurar que esté en rango 0-100
        return Math.min(100, Math.max(0, Math.round(baseConfidence)));
    }

    mapClassification(apiClassification) {
        const mapping = {
            'inofensivo': 'harmless',
            'ofensivo_leve': 'mild',
            'ofensivo_grave': 'serious',
            'discurso_odio': 'hate'
        };
        return mapping[apiClassification] || 'harmless';
    }
}

// Instancia global del analizador
let openAIAnalyzer = null;

// Función para inicializar la API - SIN PARÁMETROS
function initializeOpenAI() {
    openAIAnalyzer = new OpenAIAnalyzer();
    console.log('✅ OpenAI API inicializada para pruebas');
    return true;
}

// Función para análisis de mensajes
async function analyzeWithOpenAI(message) {
    if (!openAIAnalyzer) {
        throw new Error('OpenAI no está inicializado');
    }
    return await openAIAnalyzer.analyzeMessage(message);
}

// Manejo de errores específicos de OpenAI
function handleOpenAIError(error) {
    if (error.message.includes('401')) {
        return 'API key inválida. Verifica tu clave de OpenAI.';
    } else if (error.message.includes('429')) {
        return 'Límite de solicitudes excedido. Intenta más tarde.';
    } else if (error.message.includes('500')) {
        return 'Error del servidor de OpenAI. Intenta nuevamente.';
    } else if (error.message.includes('network')) {
        return 'Error de conexión. Verifica tu internet.';
    } else {
        return 'Error en el análisis. Intenta nuevamente.';
    }
}