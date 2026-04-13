// scripts/openai-api.js - VERSIÓN CON APRENDIZAJE AUTOMÁTICO

// ========== CONFIGURACIÓN API ==========
const API_URL = 'http://localhost:3000/api';

class OpenAIAnalyzer {
    constructor() {
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
        this.learnedWordsCache = new Map(); // Caché de palabras aprendidas
        this.hiddenPatterns = {
            '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
            '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
            '|': 'l', 'ph': 'f', 'ck': 'k', 'zz': 'ss'
        };
    }

    // ========== CARGAR PALABRAS APRENDIDAS DESDE BD ==========
    async loadLearnedWords() {
        try {
            const response = await fetch(`${API_URL}/learned-words`);
            if (response.ok) {
                const words = await response.json();
                words.forEach(word => {
                    this.learnedWordsCache.set(word.word.toLowerCase(), word);
                });
                console.log(`📚 Cargadas ${words.length} palabras aprendidas desde BD`);
            }
        } catch (error) {
            console.log('No se pudieron cargar palabras aprendidas');
        }
    }

    // ========== DECODIFICAR PALABRAS OCULTAS ==========
    decodeHiddenWord(word) {
        let decoded = word.toLowerCase();
        
        // Aplicar patrones de leet speak
        for (let [leet, letter] of Object.entries(this.hiddenPatterns)) {
            const regex = new RegExp(leet, 'gi');
            decoded = decoded.replace(regex, letter);
        }
        
        // Eliminar caracteres repetidos excesivos
        decoded = decoded.replace(/(.)\1{2,}/g, '$1$1');
        
        return decoded;
    }

    // ========== DETECTAR VARIACIONES OCULTAS ==========
    detectHiddenVariations(word, knownWordsList) {
        const decoded = this.decodeHiddenWord(word);
        
        for (let knownWord of knownWordsList) {
            // Comparación exacta después de decodificar
            if (decoded === knownWord) {
                return {
                    isHidden: true,
                    originalWord: knownWord,
                    decodedWord: decoded,
                    confidence: 0.95,
                    variation: word
                };
            }
            
            // Contiene la palabra ofensiva
            if (decoded.includes(knownWord) && decoded.length > knownWord.length) {
                return {
                    isHidden: true,
                    originalWord: knownWord,
                    decodedWord: decoded,
                    confidence: 0.85,
                    variation: word
                };
            }
            
            // Distancia de Levenshtein para palabras similares
            const distance = this.levenshteinDistance(decoded, knownWord);
            const maxLen = Math.max(decoded.length, knownWord.length);
            const similarity = 1 - (distance / maxLen);
            
            if (similarity > 0.7 && decoded.length > 3) {
                return {
                    isHidden: true,
                    originalWord: knownWord,
                    decodedWord: decoded,
                    confidence: similarity,
                    variation: word
                };
            }
        }
        
        return { isHidden: false };
    }

    // Algoritmo de distancia de Levenshtein
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // ========== APRENDER NUEVA PALABRA EN BD ==========
    async learnNewWord(word, category, confidence, mapsTo = null) {
        try {
            const response = await fetch(`${API_URL}/learn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: word.toLowerCase(),
                    category: category,
                    confidence: confidence,
                    mapsTo: mapsTo
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Actualizar caché
                this.learnedWordsCache.set(word.toLowerCase(), {
                    word: word.toLowerCase(),
                    category: category,
                    confidence: confidence,
                    maps_to: mapsTo
                });
                console.log(`🧠 IA aprendió nueva palabra: "${word}" → ${mapsTo || category}`);
                return data;
            }
        } catch (error) {
            console.log('No se pudo aprender palabra (servidor no disponible)');
        }
        return null;
    }

    // ========== REGISTRAR DETECCIÓN EN BD ==========
    async registerDetection(detectionData) {
        try {
            const response = await fetch(`${API_URL}/register-detection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(detectionData)
            });
            return await response.json();
        } catch (error) {
            console.log('No se pudo registrar detección');
            return null;
        }
    }

    // ========== PROMPT MEJORADO PARA APRENDIZAJE ==========
    createPrompt(message, learnedWordsContext) {
        // Crear contexto de palabras aprendidas
        let learnedContext = "";
        if (learnedWordsContext && learnedWordsContext.length > 0) {
            const topLearned = learnedWordsContext.slice(0, 10);
            learnedContext = `
Palabras previamente aprendidas como ofensivas: ${topLearned.map(w => `"${w.word}"`).join(', ')}
`;
        }

        return `
${learnedContext}
Analiza el siguiente mensaje para detectar ciberacoso y lenguaje ofensivo. 
IMPORTANTE: Identifica también variaciones ocultas (Leet speak, caracteres especiales, combinaciones) que intenten evadir la detección.

Responde EXCLUSIVAMENTE con un objeto JSON en este formato:

{
    "classification": "inofensivo|ofensivo_leve|ofensivo_grave|discurso_odio",
    "detected_categories": ["lenguaje_sexual", "amenazas", "discriminatorio", "bullying", "racista"],
    "explanation": "Explicación clara y educativa en español",
    "offensive_phrases": ["frase1", "frase2"],
    "hidden_variations": ["variación1", "variación2"],
    "suggestions": "Sugerencias para mejorar la comunicación",
    "confidence_score": 85,
    "new_words_to_learn": [
        {"word": "palabra_oculta", "maps_to": "palabra_real", "confidence": 85}
    ]
}

Mensaje a analizar: "${message}"

Instrucciones para "new_words_to_learn":
- Si encuentras una variación oculta (ej: "1d10t4" para "idiota"), inclúyela en este array
- "word": la variación encontrada
- "maps_to": la palabra ofensiva original a la que hace referencia
- "confidence": qué tan seguro estás (0-100)

Reglas de clasificación:
- "inofensivo": No contiene lenguaje ofensivo
- "ofensivo_leve": Insultos leves, burlas suaves
- "ofensivo_grave": Insultos graves, acoso claro
- "discurso_odio": Amenazas directas, discriminación grave

Responde SOLO con el objeto JSON, sin texto adicional.
        `;
    }

    // ========== ANÁLISIS PRINCIPAL CON APRENDIZAJE ==========
    async analyzeMessage(message) {
        if (!this.apiKey || this.apiKey === 'sk-tu-api-key-real-aqui') {
            throw new Error('Configura tu API Key de OpenAI en openai-api.js');
        }

        if (!message || message.trim().length === 0) {
            throw new Error('El mensaje no puede estar vacío');
        }

        // Obtener palabras conocidas para detección local
        const knownWords = Array.from(this.learnedWordsCache.values());
        const words = message.split(/\s+/);
        
        // PRIMERO: Detección local de palabras ocultas (más rápido)
        let localHiddenWords = [];
        for (let word of words) {
            const cleanWord = word.replace(/[.,!?;:()]/g, '');
            const hiddenCheck = this.detectHiddenVariations(cleanWord, 
                ['idiota', 'estúpido', 'tonto', 'feo', 'gordo', 'inútil', 'perdedor', 'bruto']
            );
            
            if (hiddenCheck.isHidden) {
                localHiddenWords.push(hiddenCheck);
                // Aprender inmediatamente esta variación
                await this.learnNewWord(
                    hiddenCheck.variation,
                    'cyberbullying_variant',
                    hiddenCheck.confidence,
                    hiddenCheck.originalWord
                );
            }
        }

        const prompt = this.createPrompt(message, knownWords);

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
                            content: "Eres un analizador de contenido especializado en detectar ciberacoso y lenguaje ofensivo, incluyendo variaciones ocultas. Responde SOLO con un objeto JSON válido."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 600
                })
            });

            if (!response.ok) {
                throw new Error(`Error de API: ${response.status}`);
            }

            const data = await response.json();
            const result = await this.parseResponse(data.choices[0].message.content, message);
            
            // APRENDER nuevas palabras detectadas por GPT
            if (result.newWordsToLearn && result.newWordsToLearn.length > 0) {
                for (let newWord of result.newWordsToLearn) {
                    await this.learnNewWord(
                        newWord.word,
                        'cyberbullying_variant',
                        newWord.confidence / 100,
                        newWord.maps_to
                    );
                }
            }
            
            // Combinar con palabras detectadas localmente
            if (localHiddenWords.length > 0 && !result.hiddenVariations) {
                result.hiddenVariations = localHiddenWords.map(h => h.variation);
            }
            
            // REGISTRAR detección en BD
            await this.registerDetection({
                originalText: message,
                detectedWord: result.offensivePhrases?.join(', ') || 'ninguna',
                category: result.classification,
                confidence: result.confidence / 100,
                wasHidden: (localHiddenWords.length > 0 || (result.hiddenVariations && result.hiddenVariations.length > 0))
            });
            
            return result;

        } catch (error) {
            console.error('Error en análisis con OpenAI:', error);
            throw new Error('No se pudo analizar el mensaje. Intenta nuevamente.');
        }
    }

    // ========== PARSEAR RESPUESTA CON APRENDIZAJE ==========
    parseResponse(responseText, originalMessage) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Respuesta no válida de la API');
            }

            const result = JSON.parse(jsonMatch[0]);
            
            // Validar estructura
            if (!result.classification || !result.explanation) {
                throw new Error('Respuesta de API incompleta');
            }

            // Calcular confianza dinámica
            const calculatedConfidence = this.calculateDynamicConfidence(result, originalMessage);

            return {
                classification: this.mapClassification(result.classification),
                explanation: result.explanation,
                detected: result.detected_categories || [],
                offensivePhrases: result.offensive_phrases || [],
                hiddenVariations: result.hidden_variations || [],
                newWordsToLearn: result.new_words_to_learn || [],
                suggestions: result.suggestions || 'Considera comunicarte de manera más respetuosa.',
                confidence: calculatedConfidence
            };

        } catch (error) {
            console.error('Error parseando respuesta:', error);
            throw new Error('Error procesando la respuesta del análisis');
        }
    }

    calculateDynamicConfidence(result, originalMessage) {
        let baseConfidence = result.confidence_score || 50;
        
        const classificationBase = {
            'inofensivo': 15,
            'ofensivo_leve': 65,
            'ofensivo_grave': 85,
            'discurso_odio': 95
        };

        const classification = result.classification;
        if (classificationBase[classification]) {
            baseConfidence = classificationBase[classification];
        }

        // Ajustar por variaciones ocultas detectadas
        if (result.hidden_variations && result.hidden_variations.length > 0) {
            baseConfidence += (result.hidden_variations.length * 8);
        }

        // Ajustar por palabras ofensivas
        const categoryCount = result.detected_categories ? result.detected_categories.length : 0;
        if (categoryCount > 0) {
            baseConfidence += (categoryCount * 3);
        }

        // Palabras de alta severidad
        const highSeverityWords = ['matar', 'muerte', 'suicidio', 'violar', 'amenaza'];
        const hasHighSeverity = highSeverityWords.some(word => 
            originalMessage.toLowerCase().includes(word)
        );
        if (hasHighSeverity && classification !== 'inofensivo') {
            baseConfidence += 8;
        }

        // Limitar y redondear
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

// ========== INSTANCIA GLOBAL ==========
let openAIAnalyzer = null;

// Función para inicializar la API
async function initializeOpenAI() {
    openAIAnalyzer = new OpenAIAnalyzer();
    
    // Cargar palabras aprendidas desde la BD
    await openAIAnalyzer.loadLearnedWords();
    
    console.log('✅ OpenAI API inicializada con sistema de aprendizaje automático');
    return true;
}

// Función para análisis de mensajes
async function analyzeWithOpenAI(message) {
    if (!openAIAnalyzer) {
        throw new Error('OpenAI no está inicializado');
    }
    return await openAIAnalyzer.analyzeMessage(message);
}

// Función para aprender manualmente una palabra
async function learnWordManually(word, category, mapsTo = null) {
    if (openAIAnalyzer) {
        return await openAIAnalyzer.learnNewWord(word, category, 0.9, mapsTo);
    }
    return null;
}

// Función para obtener palabras aprendidas
function getLearnedWords() {
    if (openAIAnalyzer) {
        return Array.from(openAIAnalyzer.learnedWordsCache.values());
    }
    return [];
}

// Manejo de errores
function handleOpenAIError(error) {
    if (error.message.includes('401')) {
        return 'API key inválida. Verifica tu clave de OpenAI.';
    } else if (error.message.includes('429')) {
        return 'Límite de solicitudes excedido. Intenta más tarde.';
    } else if (error.message.includes('500')) {
        return 'Error del servidor de OpenAI. Intenta nuevamente.';
    } else {
        return 'Error en el análisis. Intenta nuevamente.';
    }
}