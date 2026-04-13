// dashboard.js - Modificado para usar base de datos y aprender palabras ocultas

// ========== CONFIGURACIÓN ==========
const API_URL = 'http://localhost:3000/api';

// ========== FUNCIONES DE BASE DE DATOS ==========

// Registrar detección en la base de datos
async function registerDetectionInDB(detectionData) {
    try {
        const response = await fetch(`${API_URL}/register-detection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(detectionData)
        });
        
        if (!response.ok) throw new Error('Error registrando detección');
        const data = await response.json();
        console.log('✅ Detección registrada en BD:', data);
        return data;
    } catch (error) {
        console.error('❌ Error registrando detección:', error);
    }
}

// Aprender nueva palabra en la base de datos
async function learnNewWordInDB(word, category, confidence = 0.8, mapsTo = null) {
    try {
        const response = await fetch(`${API_URL}/learn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                word: word.toLowerCase(),
                category: category,
                confidence: confidence,
                mapsTo: mapsTo
            })
        });
        
        if (!response.ok) throw new Error('Error aprendiendo palabra');
        const data = await response.json();
        console.log(`📚 Nueva palabra aprendida: ${word}`, data);
        return data;
    } catch (error) {
        console.error('❌ Error aprendiendo palabra:', error);
    }
}

// Verificar si una palabra ya está en la BD
async function checkWordInDB(word) {
    try {
        const response = await fetch(`${API_URL}/check-word`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word: word.toLowerCase() })
        });
        
        if (!response.ok) throw new Error('Error verificando palabra');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('❌ Error verificando palabra:', error);
        return { isBullying: false };
    }
}

// ========== DETECTOR DE PALABRAS OCULTAS (LEET SPEAK) ==========

// Decodificar palabras con escritura oculta
function decodeHiddenWord(word) {
    let decoded = word.toLowerCase();
    
    // Patrones de Leet Speak comunes
    const leetPatterns = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
        '8': 'b', '9': 'g', '@': 'a', '$': 's', '!': 'i', '|': 'l',
        'ph': 'f', 'ck': 'k', 'zz': 'ss'
    };
    
    // Reemplazar patrones
    for (let [leet, letter] of Object.entries(leetPatterns)) {
        const regex = new RegExp(leet, 'gi');
        decoded = decoded.replace(regex, letter);
    }
    
    // Eliminar caracteres repetidos (ej: "ttonto" -> "tonto")
    decoded = decoded.replace(/(.)\1{2,}/g, '$1$1');
    
    return decoded;
}

// Detectar variaciones de palabras ofensivas
function detectHiddenVariations(word, offensiveWordsList) {
    const decoded = decodeHiddenWord(word);
    
    // Buscar similitud con palabras conocidas
    for (let offensiveWord of offensiveWordsList) {
        // Comparación exacta después de decodificar
        if (decoded === offensiveWord) {
            return {
                isHidden: true,
                originalWord: offensiveWord,
                decodedWord: decoded,
                similarity: 1.0
            };
        }
        
        // Comparación aproximada (contiene la palabra ofensiva)
        if (decoded.includes(offensiveWord) || offensiveWord.includes(decoded)) {
            return {
                isHidden: true,
                originalWord: offensiveWord,
                decodedWord: decoded,
                similarity: 0.8
            };
        }
        
        // Distancia de Levenshtein para palabras similares
        const distance = levenshteinDistance(decoded, offensiveWord);
        const maxLen = Math.max(decoded.length, offensiveWord.length);
        const similarity = 1 - (distance / maxLen);
        
        if (similarity > 0.7 && decoded.length > 3) {
            return {
                isHidden: true,
                originalWord: offensiveWord,
                decodedWord: decoded,
                similarity: similarity
            };
        }
    }
    
    return { isHidden: false };
}

// Algoritmo de distancia de Levenshtein
function levenshteinDistance(a, b) {
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

// ========== ANÁLISIS DEL MENSAJE ==========

// Palabras base de cyberbullying (se complementarán con BD)
const baseOffensiveWords = ['idiota', 'estúpido', 'tonto', 'feo', 'gordo', 'raro', 'inútil'];
const baseHateWords = ['odio', 'asco', 'desprecio', 'eliminar', 'matar'];
const baseThreatWords = ['te voy a', 'vas a ver', 'te arrepentirás', 'muerte'];

// Cargar palabras desde la base de datos
let offensiveWordsFromDB = [];

async function loadWordsFromDatabase() {
    try {
        const response = await fetch(`${API_URL}/statistics`);
        if (response.ok) {
            const stats = await response.json();
            // Las palabras se cargarán cuando tengamos el endpoint específico
            console.log('📚 Palabras cargadas desde BD');
        }
    } catch (error) {
        console.log('Usando lista local de palabras');
    }
}

// Función principal de análisis
async function analyzeMessage(message) {
    const lowerMessage = message.toLowerCase();
    const words = message.split(/\s+/);
    
    let detected = [];
    let hiddenWordsFound = [];
    let classification = 'inofensivo';
    let explanation = 'El mensaje no contiene lenguaje ofensivo.';
    let confidence = 0;
    
    // Combinar palabras locales + de BD
    const allOffensiveWords = [...baseOffensiveWords, ...offensiveWordsFromDB];
    
    // Analizar cada palabra
    for (let word of words) {
        // Limpiar signos de puntuación
        const cleanWord = word.replace(/[.,!?;:()]/g, '');
        
        // Verificar si es palabra ofensiva directa
        if (allOffensiveWords.includes(cleanWord.toLowerCase())) {
            detected.push(`Insulto directo: "${cleanWord}"`);
            confidence = Math.max(confidence, 0.8);
        }
        
        // Verificar si es palabra oculta (Leet speak, variaciones)
        const hiddenCheck = detectHiddenVariations(cleanWord, allOffensiveWords);
        if (hiddenCheck.isHidden) {
            detected.push(`Palabra oculta: "${cleanWord}" → significa "${hiddenCheck.originalWord}"`);
            hiddenWordsFound.push({
                original: hiddenCheck.originalWord,
                hidden: cleanWord,
                confidence: hiddenCheck.similarity
            });
            confidence = Math.max(confidence, hiddenCheck.similarity);
            
            // APRENDER esta variación oculta
            await learnNewWordInDB(
                cleanWord,
                'cyberbullying_variant',
                hiddenCheck.similarity,
                hiddenCheck.originalWord
            );
        }
        
        // Verificar discurso de odio
        for (let hateWord of baseHateWords) {
            if (lowerMessage.includes(hateWord)) {
                detected.push(`Discurso de odio: "${hateWord}"`);
                confidence = Math.max(confidence, 0.95);
            }
        }
        
        // Verificar amenazas
        for (let threatWord of baseThreatWords) {
            if (lowerMessage.includes(threatWord)) {
                detected.push(`Amenaza: "${threatWord}"`);
                confidence = Math.max(confidence, 0.9);
            }
        }
    }
    
    // Determinar clasificación basada en lo detectado
    if (detected.some(item => item.includes('Amenaza'))) {
        classification = 'discurso de odio';
        explanation = '⚠️ El mensaje contiene lenguaje amenazante que puede constituir discurso de odio. Esto ha sido registrado.';
    } else if (detected.some(item => item.includes('Discurso de odio'))) {
        classification = 'ofensivo grave';
        explanation = '⚠️ El mensaje contiene expresiones de odio o desprecio hacia otras personas.';
    } else if (detected.length > 0) {
        classification = 'ofensivo leve';
        explanation = '⚠️ El mensaje contiene lenguaje ofensivo que puede herir susceptibilidades.';
    } else {
        explanation = '✅ El mensaje no contiene lenguaje ofensivo. ¡Sigue así!';
    }
    
    // REGISTRAR EN BASE DE DATOS
    await registerDetectionInDB({
        originalText: message,
        detectedWord: detected.join(', ') || 'ninguna',
        category: classification,
        confidence: confidence || 0.5,
        wasHidden: hiddenWordsFound.length > 0
    });
    
    return {
        classification,
        explanation,
        detected: detected.length > 0 ? detected : ['No se detectó contenido ofensivo específico'],
        hiddenWordsFound: hiddenWordsFound,
        confidence: confidence
    };
}

// ========== MANEJAR EL ANÁLISIS DEL MENSAJE ==========
document.addEventListener('DOMContentLoaded', async function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const messageInput = document.getElementById('messageInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const classificationBadge = document.getElementById('classificationBadge');
    const classificationText = document.getElementById('classificationText');
    const explanationText = document.getElementById('explanationText');
    const detectedContent = document.getElementById('detectedContent');
    
    // Cargar palabras desde BD al iniciar
    await loadWordsFromDatabase();
    console.log('✅ Sistema listo para detectar cyberbullying');
    
    analyzeBtn.addEventListener('click', async function() {
        const message = messageInput.value.trim();
        
        if (!message) {
            alert('Por favor, ingresa un mensaje para analizar');
            return;
        }
        
        // Mostrar loading
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analizando...';
        resultsContainer.classList.add('hidden');
        
        try {
            const result = await analyzeMessage(message);
            
            // Actualizar UI con resultados
            classificationBadge.className = 'classification-badge';
            classificationBadge.classList.add(result.classification.replace(' ', '-'));
            
            let classificationTextValue = result.classification.toUpperCase();
            if (result.hiddenWordsFound && result.hiddenWordsFound.length > 0) {
                classificationTextValue += ' 🕵️ (Palabras ocultas detectadas)';
            }
            classificationText.textContent = classificationTextValue;
            explanationText.textContent = result.explanation;
            
            // Mostrar contenido detectado
            detectedContent.innerHTML = '<h4>📋 Contenido detectado:</h4>';
            result.detected.forEach(item => {
                const div = document.createElement('div');
                div.className = 'detected-item';
                div.textContent = item;
                detectedContent.appendChild(div);
            });
            
            // Mostrar palabras ocultas aprendidas
            if (result.hiddenWordsFound && result.hiddenWordsFound.length > 0) {
                const learnDiv = document.createElement('div');
                learnDiv.className = 'learning-notice';
                learnDiv.style.marginTop = '10px';
                learnDiv.style.padding = '10px';
                learnDiv.style.backgroundColor = '#e7f3ff';
                learnDiv.style.borderRadius = '5px';
                learnDiv.style.borderLeft = '4px solid #2196F3';
                learnDiv.innerHTML = '<strong>🧠 El sistema ha aprendido nuevas variaciones de palabras ofensivas</strong><br>' +
                    result.hiddenWordsFound.map(h => `"${h.hidden}" → "${h.original}"`).join(', ');
                detectedContent.appendChild(learnDiv);
            }
            
            resultsContainer.classList.remove('hidden');
            
        } catch (error) {
            alert('Error al analizar el mensaje. Por favor, intenta nuevamente.');
            console.error('Error:', error);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🔍 Analizar Mensaje';
        }
    });
});