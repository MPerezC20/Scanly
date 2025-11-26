// Simulación de análisis con IA (en un caso real, conectarías con la API de OpenAI)
function analyzeMessage(message) {
    // Simular procesamiento
    return new Promise((resolve) => {
        setTimeout(() => {
            // Análisis simulado basado en palabras clave
            const offensiveWords = ['idiota', 'estúpido', 'tonto', 'feo', 'gordo', 'raro', 'inútil'];
            const hateWords = ['odio', 'asco', 'desprecio', 'eliminar', 'matar'];
            const threatWords = ['te voy a', 'vas a ver', 'te arrepentirás', 'muerte'];
            
            let classification = 'inofensivo';
            let explanation = 'El mensaje no contiene lenguaje ofensivo.';
            let detected = [];
            
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
            
            // Determinar clasificación
            if (detected.some(item => item.includes('Amenaza'))) {
                classification = 'discurso de odio';
                explanation = 'El mensaje contiene lenguaje amenazante que puede constituir discurso de odio.';
            } else if (detected.some(item => item.includes('Discurso de odio'))) {
                classification = 'ofensivo grave';
                explanation = 'El mensaje contiene expresiones de odio o desprecio hacia otras personas.';
            } else if (detected.length > 0) {
                classification = 'ofensivo leve';
                explanation = 'El mensaje contiene lenguaje ofensivo que puede herir susceptibilidades.';
            }
            
            resolve({
                classification,
                explanation,
                detected: detected.length > 0 ? detected : ['No se detectó contenido ofensivo específico']
            });
        }, 2000); // Simular delay de procesamiento
    });
}

// Manejar el análisis del mensaje
document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const messageInput = document.getElementById('messageInput');
    const resultsContainer = document.getElementById('resultsContainer');
    const classificationBadge = document.getElementById('classificationBadge');
    const classificationText = document.getElementById('classificationText');
    const explanationText = document.getElementById('explanationText');
    const detectedContent = document.getElementById('detectedContent');
    
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
            
            classificationText.textContent = result.classification.toUpperCase();
            explanationText.textContent = result.explanation;
            
            // Mostrar contenido detectado
            detectedContent.innerHTML = '<h4>Contenido detectado:</h4>';
            result.detected.forEach(item => {
                const div = document.createElement('div');
                div.className = 'detected-item';
                div.textContent = item;
                detectedContent.appendChild(div);
            });
            
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