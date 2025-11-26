// scripts/main.js - VERSIÓN COMPLETA CON PORCENTAJE DINÁMICO
document.addEventListener('DOMContentLoaded', function() {
    // ✅ INICIALIZAR OPENAI SIN PARÁMETROS
    initializeOpenAI();
    
    // Resto del código de inicialización
    initializeAnalyzer();
    setupEventListeners();
});

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

// ✅ FUNCIÓN DE FALLBACK MEJORADA (ANÁLISIS SIMULADO)
async function analyzeMessageSimulated(message) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // ✅ SI NO HAY MENSAJE, DEVOLVER 0%
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

            const offensiveWords = ['idiota', 'estúpido', 'tonto', 'feo', 'gordo', 'raro', 'inútil'];
            const hateWords = ['odio', 'asco', 'desprecio', 'eliminar', 'matar', 'muerte', 'violar'];
            const threatWords = ['te voy a', 'vas a ver', 'te arrepentirás', 'muerte', 'matar', 'amenazo'];
            
            let classification = 'harmless';
            let explanation = 'El mensaje no contiene lenguaje ofensivo detectable.';
            let detected = [];
            let suggestions = 'Continúa comunicándote de manera respetuosa.';
            let confidence = 15; // Base baja para inofensivo
            
            const lowerMessage = message.toLowerCase();
            
            // Detectar palabras ofensivas
            offensiveWords.forEach(word => {
                if (lowerMessage.includes(word)) {
                    detected.push(`Insulto: "${word}"`);
                }
            });
            
            // Detectar discurso de odio
            hateWords.forEach(word => {
                if (lowerMessage.includes(word)) {
                    detected.push(`Discurso de odio: "${word}"`);
                }
            });
            
            // Detectar amenazas
            threatWords.forEach(word => {
                if (lowerMessage.includes(word)) {
                    detected.push(`Amenaza: "${word}"`);
                }
            });
            
            // Determinar clasificación y confianza (0-100)
            const hasThreat = detected.some(item => item.includes('Amenaza')) || 
                             lowerMessage.includes('matar') || 
                             lowerMessage.includes('muerte');
            
            const hasHateSpeech = detected.some(item => item.includes('Discurso de odio'));
            const offensiveCount = detected.length;

            if (hasThreat) {
                classification = 'hate';
                explanation = 'El mensaje contiene lenguaje amenazante que puede constituir discurso de odio.';
                suggestions = 'Este tipo de comunicación es muy grave. Considera buscar ayuda si estás en una situación de riesgo.';
                confidence = 95 + Math.floor(Math.random() * 5); // 95-99%
            } else if (hasHateSpeech) {
                classification = 'hate';
                explanation = 'El mensaje contiene expresiones de odio o desprecio hacia otras personas.';
                suggestions = 'El lenguaje de odio puede causar daños psicológicos graves. Reflexiona sobre el impacto de tus palabras.';
                confidence = 90 + Math.floor(Math.random() * 5); // 90-94%
            } else if (offensiveCount >= 3) {
                classification = 'serious';
                explanation = 'El mensaje contiene múltiples expresiones ofensivas y lenguaje claramente inapropiado.';
                suggestions = 'Reflexiona sobre el impacto de tus palabras en los demás. La comunicación respetuosa es fundamental.';
                confidence = 80 + Math.floor(Math.random() * 10); // 80-89%
            } else if (offensiveCount >= 2) {
                classification = 'serious';
                explanation = 'El mensaje contiene lenguaje ofensivo grave.';
                suggestions = 'Considera expresar tus ideas sin recurrir a insultos o lenguaje ofensivo.';
                confidence = 75 + Math.floor(Math.random() * 5); // 75-79%
            } else if (offensiveCount === 1) {
                classification = 'mild';
                explanation = 'El mensaje contiene lenguaje ofensivo leve.';
                suggestions = 'Piensa en cómo te sentirías si recibieras este mensaje. Considera reformularlo de manera más respetuosa.';
                confidence = 60 + Math.floor(Math.random() * 10); // 60-69%
            } else {
                // Mensaje inofensivo
                explanation = '¡Excelente! El mensaje muestra comunicación respetuosa.';
                suggestions = 'Continúa practicando una comunicación positiva y constructiva.';
                confidence = 10 + Math.floor(Math.random() * 15); // 10-24%
            }
            
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