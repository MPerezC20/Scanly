// Modificar el DOMContentLoaded existente
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar analizador inmediatamente (no bloquear por llamadas de red)
    initializeAnalyzer();
    setupEventListeners();

    // Inicializar OpenAI en segundo plano (opcional)
    initializeOpenAI().catch(() => {});

    // Cargar estadísticas en segundo plano
    loadStatistics();
    loadWeeklyStats();
    loadTopWords();
    loadLearningProgress();

    // Mantener estadísticas del index sincronizadas con el sistema real
    setInterval(() => {
        loadStatistics();
        loadWeeklyStats();
        loadTopWords();
    }, 10000);

    console.log('✅ Sistema listo - Analizador activo');
});
// scripts/main.js - AGREGAR ESTAS FUNCIONES AL INICIO

// ========== CONFIGURACIÓN API ==========
const MAIN_API_URL = 'http://localhost:3000/api';

// ========== FUNCIONES DE ESTADÍSTICAS ==========

// Cargar estadísticas desde la BD
async function loadStatistics() {
    try {
        const response = await fetch(`${MAIN_API_URL}/statistics`);
        if (!response.ok) throw new Error('Error cargando estadísticas');
        const stats = await response.json();

        // Actualizar palabras aprendidas
        const learnedWordsEl = document.getElementById('totalLearnedWords');
        if (learnedWordsEl) learnedWordsEl.textContent = stats.totalLearnedWords || 0;

        // Actualizar palabras pendientes
        const pendingEl = document.getElementById('pendingWords');
        if (pendingEl) pendingEl.textContent = stats.pendingWords || 0;

        // Actualizar palabras aprobadas
        const approvedEl = document.getElementById('approvedWords');
        if (approvedEl) approvedEl.textContent = stats.approvedWords || 0;

        // Actualizar palabras rechazadas
        const rejectedEl = document.getElementById('rejectedWords');
        if (rejectedEl) rejectedEl.textContent = stats.rejectedWords || 0;

        // Actualizar detecciones totales
        const detectionsEl = document.getElementById('totalDetections');
        if (detectionsEl) detectionsEl.textContent = stats.totalDetections || 0;

        // Actualizar detecciones de hoy
        const todayEl = document.getElementById('todayDetections');
        if (todayEl) todayEl.textContent = stats.todayDetections || 0;

        // Actualizar detecciones ofensivas
        const offensiveEl = document.getElementById('offensiveDetections');
        if (offensiveEl) offensiveEl.textContent = stats.offensiveDetections || 0;

        // Actualizar confianza promedio
        const avgConfidenceEl = document.getElementById('avgConfidence');
        const avgConfidence = stats.avgConfidence ? Math.round(stats.avgConfidence * 100) : 0;
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
        const response = await fetch(`${MAIN_API_URL}/weekly-stats`);
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

// ========== GRÁFICO DE PROGRESO DEL APRENDIZAJE ==========
async function loadLearningProgress() {
    try {
        const response = await fetch(`${MAIN_API_URL}/learning-progress`);
        const progress = await response.json();
        drawLearningProgressChart(progress);

        const summaryResponse = await fetch(`${MAIN_API_URL}/learning-summary`);
        const summary = await summaryResponse.json();
        displayLearningSummary(summary);

        return { progress, summary };
    } catch (error) {
        console.log('No se pudo cargar progreso del aprendizaje');
        return null;
    }
}

function drawLearningProgressChart(data) {
    const canvas = document.getElementById('learningProgressChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    canvas.width = Math.min(600, container.clientWidth - 40);
    canvas.height = 250;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!data || data.length === 0) {
        ctx.fillStyle = '#718096';
        ctx.font = '14px Arial';
        ctx.fillText('No hay datos de progreso aún', 20, 30);
        ctx.fillText('El gráfico mostrará el progreso cuando se aprueben o rechacen palabras', 20, 50);
        return;
    }

    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    const dates = data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const approved = data.map(d => d.approved || 0);
    const rejected = data.map(d => d.rejected || 0);
    const pending = data.map(d => d.pending || 0);

    const maxValue = Math.max(...approved, ...rejected, ...pending, 1);
    const barWidth = chartWidth / dates.length - 10;

    // Dibujar leyenda
    ctx.font = '12px Arial';
    ctx.fillStyle = '#48bb78';
    ctx.fillRect(padding, 10, 12, 12);
    ctx.fillText('Aprobadas', padding + 18, 20);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(padding + 100, 10, 12, 12);
    ctx.fillText('Rechazadas', padding + 118, 20);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(padding + 210, 10, 12, 12);
    ctx.fillText('Pendientes', padding + 228, 20);

    // Dibujar barras
    for (let i = 0; i < dates.length; i++) {
        const x = padding + i * (barWidth + 10);

        // Barra aprobada (verde)
        const approvedHeight = (approved[i] / maxValue) * chartHeight;
        if (approvedHeight > 0) {
            ctx.fillStyle = '#48bb78';
            ctx.fillRect(x, canvas.height - padding - approvedHeight, barWidth, approvedHeight);
        }

        // Barra rechazada (rojo) - apilada encima
        const rejectedHeight = (rejected[i] / maxValue) * chartHeight;
        if (rejectedHeight > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x, canvas.height - padding - approvedHeight - rejectedHeight, barWidth, rejectedHeight);
        }

        // Barra pendiente (amarillo) - apilada encima
        const pendingHeight = (pending[i] / maxValue) * chartHeight;
        if (pendingHeight > 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(x, canvas.height - padding - approvedHeight - rejectedHeight - pendingHeight, barWidth, pendingHeight);
        }

        // Etiqueta
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText(dates[i], x + barWidth / 2 - 10, canvas.height - padding + 15);
    }

    // Ejes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
}

function displayLearningSummary(summary) {
    const container = document.getElementById('learningSummary');
    if (!container) return;

    let html = `
        <div class="learning-summary-item">
            <h4>Total Aprendidas</h4>
            <p>${summary.totalLearned || 0}</p>
        </div>
        <div class="learning-summary-item">
            <h4>Veces Detectadas</h4>
            <p>${summary.totalDetections || 0}</p>
        </div>
    `;

    if (summary.topCategories && summary.topCategories.length > 0) {
        html += `
            <div class="learning-summary-item">
                <h4>Categoría Principal</h4>
                <p class="category">${summary.topCategories[0].category}</p>
            </div>
        `;
    }

    if (summary.topLearnedWords && summary.topLearnedWords.length > 0) {
        html += `
            <div class="learning-summary-item">
                <h4>Más Usada</h4>
                <p class="category">"${summary.topLearnedWords[0].word}"</p>
            </div>
        `;
    }

    container.innerHTML = html;
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
        const response = await fetch(`${MAIN_API_URL}/top-words`);
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
        const response = await fetch(`${MAIN_API_URL}/register-detection`, {
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

// ========== GUARDAR PALABRA COMO PENDIENTE (APRENDIZAJE SUPERVISADO) ==========
async function saveWordAsPendingFallback(word, mapsTo, confidence) {
    try {
        await fetch(`${MAIN_API_URL}/pending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: word.toLowerCase(),
                category: 'cyberbullying_variant',
                confidence: confidence,
                mapsTo: mapsTo,
                detectedText: 'detectado en análisis'
            })
        });
    } catch (error) {
        console.log('No se pudo guardar palabra pendiente (servidor no disponible)');
    }
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
    // Si index-analyzer.js está activo, evitamos doble binding de eventos
    if (window.__INDEX_ANALYZER_ACTIVE__) {
        return;
    }

    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const inputEl = document.getElementById('messageInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const confidenceText = document.getElementById('confidenceText');

    if (!analyzeBtn || !inputEl || !resultsContainer || !welcomeMessage) {
        console.error('❌ Analyzer UI incompleta: faltan elementos del DOM');
        return;
    }

    const resetAnalyzer = () => {
        inputEl.value = '';
        if (typeof charCount !== 'undefined' && charCount) charCount.textContent = '0';
        if (confidenceText) confidenceText.textContent = '0%';
        resultsContainer.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
        inputEl.focus();
    };

    const runAnalysis = async () => {
        const message = inputEl.value.trim();
        if (!message) {
            showNotification('Por favor, ingresa un mensaje para analizar', 'warning');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';

        try {
            const result = await analyzeMessageSimulated(message);
            updateResultsUI(result);
            welcomeMessage.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
        } catch (error) {
            console.error('Error en análisis:', error);
            showNotification('Error al analizar el mensaje', 'error');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Mensaje';
        }
    };

    analyzeBtn.onclick = runAnalysis;

    if (clearBtn) {
        clearBtn.onclick = resetAnalyzer;
    }

    inputEl.addEventListener('input', function() {
        if (typeof charCount !== 'undefined' && charCount) {
            charCount.textContent = this.value.length;
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
            for (const word of words) {
                const cleanWord = word.replace(/[.,!?;:()]/g, '');
                if (cleanWord.length < 2) continue;

                const decoded = decodeLeetSpeak(cleanWord);

                for (const offensive of offensiveWords) {
                    if (decoded === offensive || (decoded.includes(offensive) && decoded.length > 3)) {
                        hiddenWordsFound.push({
                            original: cleanWord,
                            decoded: decoded,
                            mapsTo: offensive
                        });
                        detected.push(`Palabra oculta: "${cleanWord}" → significa "${offensive}"`);
                        // Guardar como pendiente
                        try { await saveWordAsPendingFallback(cleanWord, offensive, 0.8); } catch(e) {}
                        break;
                    }
                }
            }
            
// Detectar palabras ofensivas normales
            for (const word of offensiveWords) {
                if (lowerMessage.includes(word)) {
                    if (!detected.some(d => d.includes(word))) {
                        detected.push(`Insulto: "${word}"`);
                        // Guardar como pendiente
                        try { await saveWordAsPendingFallback(word, word, 0.9); } catch(e) {}
                    }
                }
            }

            // Detectar discurso de odio
            for (const word of hateWords) {
                if (lowerMessage.includes(word)) {
                    if (!detected.some(d => d.includes(word))) {
                        detected.push(`Discurso de odio: "${word}"`);
                        try { await saveWordAsPendingFallback(word, 'discurso_odio', 0.95); } catch(e) {}
                    }
                }
            }

            // Detectar amenazas
            for (const word of threatWords) {
                if (lowerMessage.includes(word)) {
                    if (!detected.some(d => d.includes(word))) {
                        detected.push(`Amenaza: "${word}"`);
                        try { await saveWordAsPendingFallback(word, 'amenaza', 0.95); } catch(e) {}
                    }
                }
            }
            
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
