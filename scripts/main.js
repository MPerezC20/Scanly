// Modificar el DOMContentLoaded existente
document.addEventListener('DOMContentLoaded', async function() {
    // Cargar estadísticas al iniciar
    await loadStatistics();
    await loadWeeklyStats();
    await loadTopWords();
    
    // Inicializar OpenAI
    initializeOpenAI();
    
    // Inicializar analizador
    initializeAnalyzer();
    setupEventListeners();
    
    console.log('✅ Sistema listo - Las estadísticas se actualizarán automáticamente');
});     
// scripts/main.js - AGREGAR ESTAS FUNCIONES AL INICIO

// ========== CONFIGURACIÓN API ==========
const API_URL = 'http://localhost:3000/api';

// ========== FUNCIONES DE ESTADÍSTICAS ==========

// Cargar estadísticas desde la BD
async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/statistics`);
        if (!response.ok) throw new Error('Error cargando estadísticas');
        const stats = await response.json();
        
        // Actualizar números
        const learnedWordsEl = document.getElementById('totalLearnedWords');
        const detectionsEl = document.getElementById('totalDetections');
        const avgConfidenceEl = document.getElementById('avgConfidence');
        
        if (learnedWordsEl) learnedWordsEl.textContent = stats.totalLearnedWords || 0;
        if (detectionsEl) detectionsEl.textContent = stats.totalDetections || 0;
        
        // Calcular confianza promedio
        const avgConfidence = stats.avgConfidence ? Math.round(stats.avgConfidence * 100) : 85;
        if (avgConfidenceEl) avgConfidenceEl.textContent = `${avgConfidence}%`;
        
        return stats;
    } catch (error) {
        console.log('Servidor no disponible, usando modo offline');
        return null;
    }
}

// Cargar estadísticas semanales
async function loadWeeklyStats() {
    try {
        const response = await fetch(`${API_URL}/weekly-stats`);
        if (!response.ok) throw new Error('Error cargando stats semanales');
        const stats = await response.json();
        drawWeeklyChart(stats);
        return stats;
    } catch (error) {
        console.log('No se pudo cargar gráfico semanal');
        showChartEmpty();
        return [];
    }
}

// Dibujar gráfico semanal
function drawWeeklyChart(data) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Ajustar tamaño
    canvas.width = Math.min(700, container.clientWidth - 40);
    canvas.height = 250;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!data || data.length === 0) {
        showChartEmpty();
        return;
    }
    
    hideChartEmpty();
    
    // Preparar datos
    const dates = data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const detections = data.map(d => d.detections);
    const maxDetection = Math.max(...detections, 1);
    
    // Configurar gráfico
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = (chartWidth / dates.length) - 8;
    
    // Dibujar ejes
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Dibujar barras
    for (let i = 0; i < dates.length; i++) {
        const x = padding + i * (barWidth + 8);
        const height = (detections[i] / maxDetection) * chartHeight;
        const y = canvas.height - padding - height;
        
        // Barra
        ctx.fillStyle = '#667eea';
        ctx.fillRect(x, y, barWidth, Math.max(height, 2));
        
        // Etiqueta
        ctx.fillStyle = '#666';
        ctx.font = '9px Arial';
        ctx.fillText(dates[i], x + barWidth / 2 - 12, canvas.height - padding + 12);
        
        // Valor
        if (detections[i] > 0) {
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText(detections[i], x + barWidth / 2 - 8, y - 5);
        }
    }
}

function showChartEmpty() {
    const emptyMsg = document.getElementById('chartEmptyMessage');
    if (emptyMsg) emptyMsg.classList.remove('hidden');
}

function hideChartEmpty() {
    const emptyMsg = document.getElementById('chartEmptyMessage');
    if (emptyMsg) emptyMsg.classList.add('hidden');
}

// Cargar top palabras
async function loadTopWords() {
    try {
        const response = await fetch(`${API_URL}/top-words`);
        if (!response.ok) throw new Error('Error cargando top palabras');
        const words = await response.json();
        displayTopWords(words);
        return words;
    } catch (error) {
        console.log('No se pudieron cargar top palabras');
        displayTopWords([]);
        return [];
    }
}

function displayTopWords(words) {
    const container = document.getElementById('topWordsList');
    if (!container) return;
    
    if (!words || words.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center; padding:40px; color:#999;">
                <i class="fas fa-inbox" style="font-size:48px; margin-bottom:15px;"></i>
                <p>Aún no hay palabras detectadas</p>
                <small>Analiza mensajes para ver estadísticas</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = words.slice(0, 6).map(word => `
        <div class="word-card">
            <span class="word-text">
                <i class="fas fa-comment-dots"></i> ${word.detected_word}
            </span>
            <span class="word-count">${word.times} veces</span>
        </div>
    `).join('');
}

// ========== FUNCIÓN PARA REGISTRAR DETECCIONES ==========
async function registerDetection(detectionData) {
    try {
        const response = await fetch(`${API_URL}/register-detection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(detectionData)
        });
        const data = await response.json();
        console.log('✅ Detección registrada en BD');
        
        // Actualizar estadísticas después de registrar
        setTimeout(() => {
            loadStatistics();
            loadWeeklyStats();
            loadTopWords();
        }, 500);
        
        return data;
    } catch (error) {
        console.log('Modo offline: detección no registrada en BD');
        return null;
    }
}

// ========== DECODIFICAR LEET SPEAK ==========
function decodeLeetSpeak(text) {
    const leetMap = {
        '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
        '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
        '|': 'l', 'ph': 'f', 'ck': 'k'
    };
    
    let decoded = text.toLowerCase();
    for (let [leet, letter] of Object.entries(leetMap)) {
        decoded = decoded.replace(new RegExp(leet, 'g'), letter);
    }
    return decoded;
}

// Contador de caracteres
const messageInput = document.getElementById('messageInput');
const charCount = document.getElementById('charCount');

if (messageInput && charCount) {
    messageInput.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });
}

// Smooth scroll para navegación
function setupEventListeners() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Animación de aparición para elementos
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observar elementos para animación
document.querySelectorAll('.feature-card, .analyzer-container').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ✅ FUNCIÓN MEJORADA DEL ANALIZADOR CON RESET A 0%
function initializeAnalyzer() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const messageInput = document.getElementById('messageInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const confidenceText = document.getElementById('confidenceText');
    
    if (!analyzeBtn) return;

    // ✅ FUNCIÓN PARA LIMPIAR Y RESETEAR TODO
    function resetAnalyzer() {
        messageInput.value = '';
        if (charCount) charCount.textContent = '0';
        
        // Resetear el porcentaje de confianza a 0%
        if (confidenceText) {
            confidenceText.textContent = '0%';
        }
        
        // Resetear el color de la badge
        const confidenceBadge = document.getElementById('confidenceBadge');
        if (confidenceBadge) {
            confidenceBadge.style.background = '#10b981'; // Verde para 0%
        }
        
        // Ocultar resultados y mostrar mensaje de bienvenida
        resultsContainer.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
        
        messageInput.focus();
    }

    analyzeBtn.addEventListener('click', async function() {
        const message = messageInput.value.trim();
        
        if (!message) {
            showNotification('Por favor, ingresa un mensaje para analizar', 'warning');
            
            // ✅ ACTUALIZAR A 0% CUANDO NO HAY MENSAJE
            if (confidenceText) {
                confidenceText.textContent = '0%';
            }
            const confidenceBadge = document.getElementById('confidenceBadge');
            if (confidenceBadge) {
                confidenceBadge.style.background = '#10b981'; // Verde para 0%
            }
            return;
        }

        // Mostrar loading
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';

        try {
            // ✅ USAR LA API REAL DE OPENAI
            const result = await analyzeWithOpenAI(message);
            
            // Actualizar UI con resultados reales
            updateResultsUI(result);
            
            // Mostrar resultados
            welcomeMessage.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
            
            showNotification('Análisis completado con IA', 'success');
            
        } catch (error) {
            console.error('Error en análisis con OpenAI:', error);
            
            // Fallback al análisis simulado si la API falla
            showNotification('Usando análisis local...', 'warning');
            const fallbackResult = await analyzeMessageSimulated(message);
            updateResultsUI(fallbackResult);
            welcomeMessage.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
            
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Mensaje';
        }
    });
    
    // ✅ USAR LA NUEVA FUNCIÓN RESET EN EL BOTÓN LIMPIAR
    clearBtn.addEventListener('click', resetAnalyzer);

    // ✅ DETECTAR CUANDO SE ELIMINA TODO EL TEXTO MANUALMENTE
    messageInput.addEventListener('input', function() {
        // Actualizar contador de caracteres
        if (charCount) {
            charCount.textContent = this.value.length;
        }
        
        // ✅ SI EL TEXTO ESTÁ VACÍO, RESETEAR A 0%
        if (this.value.trim().length === 0) {
            if (confidenceText) {
                confidenceText.textContent = '0%';
            }
            const confidenceBadge = document.getElementById('confidenceBadge');
            if (confidenceBadge) {
                confidenceBadge.style.background = '#10b981'; // Verde para 0%
            }
            
            // También ocultar resultados si están visibles
            if (!resultsContainer.classList.contains('hidden')) {
                resultsContainer.classList.add('hidden');
                welcomeMessage.classList.remove('hidden');
            }
        }
    });
}

// FUNCIÓN DE FALLBACK MEJORADA CON REGISTRO EN BD
async function analyzeMessageSimulated(message) {
    return new Promise(async (resolve) => {
        setTimeout(async () => {
            if (!message || message.trim().length === 0) {
                resolve({
                    classification: 'harmless',
                    explanation: 'No hay mensaje para analizar.',
                    detected: ['Ingresa un mensaje para comenzar el análisis'],
                    suggestions: 'Escribe o pega un mensaje en el área de texto.',
                    confidence: 0
                });
                return;
            }

            const offensiveWords = ['idiota', 'estúpido', 'tonto', 'feo', 'gordo', 'raro', 'inútil', 'perdedor', 'bruto'];
            const hateWords = ['odio', 'asco', 'desprecio', 'eliminar', 'matar', 'muerte', 'violar'];
            const threatWords = ['te voy a', 'vas a ver', 'te arrepentirás', 'amenazo'];
            
            let classification = 'harmless';
            let explanation = 'El mensaje no contiene lenguaje ofensivo detectable.';
            let detected = [];
            let suggestions = 'Continúa comunicándote de manera respetuosa.';
            let confidence = 15;
            
            const lowerMessage = message.toLowerCase();
            const words = message.split(/\s+/);
            
            // Detectar palabras ocultas (Leet Speak)
            let hiddenWordsFound = [];
            for (let word of words) {
                const cleanWord = word.replace(/[.,!?;:()]/g, '');
                const decoded = decodeLeetSpeak(cleanWord);
                
                for (let offensive of offensiveWords) {
                    if (decoded === offensive || (decoded.includes(offensive) && decoded.length > 3)) {
                        hiddenWordsFound.push({
                            original: cleanWord,
                            decoded: decoded,
                            mapsTo: offensive
                        });
                        detected.push(`Palabra oculta: "${cleanWord}" → significa "${offensive}"`);
                        break;
                    }
                }
            }
            
            // Detectar palabras ofensivas normales
            offensiveWords.forEach(word => {
                if (lowerMessage.includes(word)) {
                    if (!detected.some(d => d.includes(word))) {
                        detected.push(`Insulto: "${word}"`);
                    }
                }
            });
            
            // Detectar discurso de odio
            hateWords.forEach(word => {
                if (lowerMessage.includes(word)) {
                    if (!detected.some(d => d.includes(word))) {
                        detected.push(`Discurso de odio: "${word}"`);
                    }
                }
            });
            
            // Detectar amenazas
            threatWords.forEach(word => {
                if (lowerMessage.includes(word)) {
                    if (!detected.some(d => d.includes(word))) {
                        detected.push(`Amenaza: "${word}"`);
                    }
                }
            });
            
            // Determinar clasificación y confianza
            const hasThreat = detected.some(item => item.includes('Amenaza'));
            const hasHateSpeech = detected.some(item => item.includes('Discurso de odio'));
            const offensiveCount = detected.filter(d => d.includes('Insulto') || d.includes('Palabra oculta')).length;

            if (hasThreat) {
                classification = 'hate';
                explanation = '⚠️ El mensaje contiene lenguaje amenazante que puede constituir discurso de odio.';
                suggestions = 'Este tipo de comunicación es muy grave. Considera buscar ayuda si estás en una situación de riesgo.';
                confidence = 95 + Math.floor(Math.random() * 5);
            } else if (hasHateSpeech) {
                classification = 'hate';
                explanation = '⚠️ El mensaje contiene expresiones de odio o desprecio hacia otras personas.';
                suggestions = 'El lenguaje de odio puede causar daños psicológicos graves. Reflexiona sobre el impacto de tus palabras.';
                confidence = 90 + Math.floor(Math.random() * 5);
            } else if (offensiveCount >= 3) {
                classification = 'serious';
                explanation = '⚠️ El mensaje contiene múltiples expresiones ofensivas y lenguaje claramente inapropiado.';
                suggestions = 'Reflexiona sobre el impacto de tus palabras en los demás. La comunicación respetuosa es fundamental.';
                confidence = 80 + Math.floor(Math.random() * 10);
            } else if (offensiveCount >= 2) {
                classification = 'serious';
                explanation = '⚠️ El mensaje contiene lenguaje ofensivo grave.';
                suggestions = 'Considera expresar tus ideas sin recurrir a insultos o lenguaje ofensivo.';
                confidence = 75 + Math.floor(Math.random() * 5);
            } else if (offensiveCount === 1 || hiddenWordsFound.length > 0) {
                classification = 'mild';
                explanation = '⚠️ El mensaje contiene lenguaje ofensivo leve.';
                suggestions = 'Piensa en cómo te sentirías si recibieras este mensaje. Considera reformularlo de manera más respetuosa.';
                confidence = 60 + Math.floor(Math.random() * 10);
            } else {
                explanation = '✅ ¡Excelente! El mensaje muestra comunicación respetuosa.';
                suggestions = 'Continúa practicando una comunicación positiva y constructiva.';
                confidence = 10 + Math.floor(Math.random() * 15);
            }
            
            // REGISTRAR EN BASE DE DATOS
            await registerDetection({
                originalText: message,
                detectedWord: detected.join(', ') || 'ninguna',
                category: classification,
                confidence: confidence / 100,
                wasHidden: hiddenWordsFound.length > 0
            });
            
            resolve({
                classification,
                explanation,
                detected: detected.length > 0 ? detected : ['No se detectó contenido ofensivo específico'],
                suggestions,
                confidence
            });
        }, 1000);
    });
}

// ✅ FUNCIÓN ACTUALIZADA PARA MOSTRAR RESULTADOS
function updateResultsUI(result) {
    const classificationBadge = document.getElementById('classificationBadge');
    const classificationText = document.getElementById('classificationText');
    const explanationText = document.getElementById('explanationText');
    const detectionsList = document.getElementById('detectionsList');
    const suggestionsText = document.getElementById('suggestionsText');
    const confidenceText = document.getElementById('confidenceText');
    const confidenceBadge = document.getElementById('confidenceBadge');
    
    if (!classificationBadge) return;
    
    // Actualizar clasificación
    classificationBadge.className = 'classification-badge';
    classificationBadge.classList.add(result.classification);
    
    classificationText.textContent = getClassificationLabel(result.classification);
    explanationText.textContent = result.explanation;
    suggestionsText.textContent = result.suggestions;
    
    // ✅ ACTUALIZAR EL PORCENTAJE DE CONFIANZA
    if (confidenceText) {
        confidenceText.textContent = `${result.confidence}%`;
    }
    
    // ✅ ACTUALIZAR EL COLOR DE LA BADGE SEGÚN EL PORCENTAJE (MEJORADO)
    if (confidenceBadge) {
        if (result.confidence === 0) {
            confidenceBadge.style.background = '#10b981'; // Verde para 0% (inofensivo)
        } else if (result.confidence >= 90) {
            confidenceBadge.style.background = '#ef4444'; // Rojo para 90-100% (muy ofensivo)
        } else if (result.confidence >= 75) {
            confidenceBadge.style.background = '#f59e0b'; // Naranja para 75-89% (ofensivo grave)
        } else if (result.confidence >= 50) {
            confidenceBadge.style.background = '#eab308'; // Amarillo para 50-74% (ofensivo leve)
        } else {
            confidenceBadge.style.background = '#84cc16'; // Verde lima para 1-49% (muy leve/ambiguo)
        }
    }
    
    // Actualizar detecciones
    if (detectionsList) {
        detectionsList.innerHTML = '';
        if (result.detected && result.detected.length > 0 && 
            result.detected[0] !== 'No se detectó contenido ofensivo específico') {
            result.detected.forEach(item => {
                const div = document.createElement('div');
                div.className = 'detection-item';
                div.textContent = item;
                detectionsList.appendChild(div);
            });
        } else {
            detectionsList.innerHTML = '<div class="detection-item">No se detectó contenido ofensivo</div>';
        }
    }
}

function getClassificationLabel(classification) {
    const labels = {
        'harmless': 'INOFENSIVO',
        'mild': 'OFENSIVO LEVE', 
        'serious': 'OFENSIVO GRAVE',
        'hate': 'DISCURSO DE ODIO'
    };
    return labels[classification] || classification.toUpperCase();
}

function showNotification(message, type) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);