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

// Guardar palabra como pendiente (APRENDIZAJE SUPERVISADO)
async function saveWordAsPending(word, category, confidence = 0.8, mapsTo = null, detectedText = null, source = 'system') {
    try {
        const response = await fetch(`${API_URL}/pending`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                word: word.toLowerCase(),
                category: category,
                confidence: confidence,
                mapsTo: mapsTo,
                detectedText: detectedText,
                source: source
            })
        });
        
        if (!response.ok) throw new Error('Error guardando palabra pendiente');
        const data = await response.json();
        console.log(`📝 Palabra "${word}" guardada para revisión: "${mapsTo || category}"`, data);
        return data;
    } catch (error) {
        console.error('❌ Error guardando palabra pendiente:', error);
    }
}

// Aprender nueva palabra (ahora guarda como pendiente)
async function learnNewWordInDB(word, category, confidence = 0.8, mapsTo = null) {
    return await saveWordAsPending(word, category, confidence, mapsTo);
}

// Obtener palabras pendientes
async function getPendingWords() {
    try {
        const response = await fetch(`${API_URL}/pending-words`);
        if (!response.ok) throw new Error('Error obteniendo palabras pendientes');
        return await response.json();
    } catch (error) {
        console.error('❌ Error obteniendo pendientes:', error);
        return [];
    }
}

// Aprobar palabra pendiente
async function approvePendingWord(id) {
    try {
        const response = await fetch(`${API_URL}/approve-pending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Error aprobando palabra:', error);
        return { success: false };
    }
}

// Rechazar palabra pendiente
async function rejectPendingWord(id) {
    try {
        const response = await fetch(`${API_URL}/reject-pending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        return await response.json();
    } catch (error) {
        console.error('❌ Error rechazando palabra:', error);
        return { success: false };
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
let hateWordsFromDB = [];
let threatWordsFromDB = [];

async function loadWordsFromDatabase() {
    try {
        const response = await fetch(`${API_URL}/learned-words`);
        if (response.ok) {
            const words = await response.json();
            offensiveWordsFromDB = words
                .filter(w => ['insulto', 'cyberbullying_variant', 'apariencia'].includes((w.category || '').toLowerCase()))
                .map(w => (w.word || '').toLowerCase());

            hateWordsFromDB = words
                .filter(w => ['discurso_odio', 'hate'].includes((w.category || '').toLowerCase()))
                .map(w => (w.word || '').toLowerCase());

            threatWordsFromDB = words
                .filter(w => ['amenaza', 'threat'].includes((w.category || '').toLowerCase()))
                .map(w => (w.word || '').toLowerCase());

            console.log(`📚 Palabras cargadas desde BD: ${words.length}`);
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
    const allHateWords = [...baseHateWords, ...hateWordsFromDB];
    const allThreatWords = [...baseThreatWords, ...threatWordsFromDB];
    
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
        for (let hateWord of allHateWords) {
            if (lowerMessage.includes(hateWord)) {
                detected.push(`Discurso de odio: "${hateWord}"`);
                confidence = Math.max(confidence, 0.95);
            }
        }
        
        // Verificar amenazas
        for (let threatWord of allThreatWords) {
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

// ========== CARGAR Y MOSTRAR PALABRAS PENDIENTES ==========
async function loadPendingWordsUI() {
    const container = document.getElementById('pendingWordsContainer');
    if (!container) return;

    const pending = await getPendingWords();

    if (pending.length === 0) {
        container.innerHTML = '<div class="no-pending">✅ No hay palabras pendientes de revisión</div>';
        return;
    }

    container.innerHTML = pending.map(word => `
        <div class="pending-word-card" data-id="${word.id}">
            <div class="pending-word-info">
                <strong>"${word.word}"</strong>
                ${word.maps_to ? `<div class="maps-to">→ representa: "${word.maps_to}"</div>` : ''}
                <span class="category">${word.category}</span>
                <span class="confidence">Confianza: ${Math.round((word.confidence || 0) * 100)}%</span>
                <span class="category">Origen: ${word.source || 'system'}</span>
            </div>
            <div class="pending-word-actions">
                <button class="approve-btn" onclick="handleApprove(${word.id})">✅ Aprobar</button>
                <button class="reject-btn" onclick="handleReject(${word.id})">❌ Rechazar</button>
            </div>
        </div>
    `).join('');
}

async function handleApprove(id) {
    const result = await approvePendingWord(id);
    if (result.success) {
        alert('Palabra aprobada y aprendida correctamente');
        await loadPendingWordsUI();
        await loadStatistics();
        await loadLearnedWordsUI();
        await loadLearningCurveChart();
        await loadWordsFromDatabase();
    } else {
        alert('Error al aprobar la palabra');
    }
}

async function getLearnedWords() {
    try {
        const response = await fetch(`${API_URL}/learned-words`);
        if (!response.ok) throw new Error('Error obteniendo palabras aprendidas');
        return await response.json();
    } catch (error) {
        console.error('❌ Error obteniendo aprendidas:', error);
        return [];
    }
}

async function getLearningProgress() {
    try {
        const response = await fetch(`${API_URL}/learning-progress`);
        if (!response.ok) throw new Error('Error obteniendo progreso');
        return await response.json();
    } catch (error) {
        console.error('❌ Error obteniendo progreso:', error);
        return [];
    }
}

async function handleReject(id) {
    const result = await rejectPendingWord(id);
    if (result.success) {
        alert('Palabra rechazada');
        await loadPendingWordsUI();
        await loadStatistics();
        await loadLearnedWordsUI();
        await loadLearningCurveChart();
        await loadWordsFromDatabase();
    } else {
        alert('Error al rechazar la palabra');
    }
}

async function loadLearnedWordsUI() {
    const container = document.getElementById('learnedWordsContainer');
    if (!container) return;
    const words = await getLearnedWords();
    if (!words.length) {
        container.innerHTML = '<div class="no-pending">Aún no hay palabras aprendidas</div>';
        return;
    }

    container.innerHTML = words.slice(0, 40).map(word => `
        <div class="pending-word-card">
            <div class="pending-word-info">
                <strong>"${word.word}"</strong>
                ${word.maps_to ? `<div class="maps-to">→ ${word.maps_to}</div>` : ''}
                <span class="category">${word.category || 'sin categoría'}</span>
                <span class="confidence">Confianza: ${Math.round((word.confidence || 0) * 100)}%</span>
                <span class="category">Detectada: ${word.times_detected || 1} veces</span>
            </div>
        </div>
    `).join('');
}

async function loadLearningCurveChart() {
    const canvas = document.getElementById('learningCurveChart');
    if (!canvas) return;
    const data = await getLearningProgress();
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!data.length) {
        ctx.fillStyle = '#666';
        ctx.font = '14px Arial';
        ctx.fillText('Sin datos de aprendizaje todavía', 10, 24);
        return;
    }

    const padding = 28;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;
    const maxY = Math.max(...data.map(d => (d.approved || 0) + (d.rejected || 0) + (d.pending || 0)), 1);

    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    const step = data.length > 1 ? width / (data.length - 1) : width;

    const drawLine = (key, color) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding + i * step;
            const y = canvas.height - padding - ((d[key] || 0) / maxY) * height;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
    };

    drawLine('approved', '#22c55e');
    drawLine('pending', '#f59e0b');
    drawLine('rejected', '#ef4444');
}

// Función global para recargar estadísticas
async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/statistics`);
        if (!response.ok) throw new Error('Error cargando estadísticas');
        const stats = await response.json();

        // Actualizar todos los elementos de estadísticas
        const elements = {
            'totalLearnedWords': stats.totalLearnedWords,
            'pendingWords': stats.pendingWords,
            'approvedWords': stats.approvedWords,
            'rejectedWords': stats.rejectedWords,
            'totalDetections': stats.totalDetections,
            'todayDetections': stats.todayDetections,
            'offensiveDetections': stats.offensiveDetections,
            'userInputPending': stats.userInputPending,
            'userInputApproved': stats.userInputApproved
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value || 0;
        }

        // Actualizar confianza
        const avgEl = document.getElementById('avgConfidence');
        if (avgEl) avgEl.textContent = `${Math.round((stats.avgConfidence || 0) * 100)}%`;

    } catch (error) {
        console.log('No se pudieron cargar estadísticas');
    }
}

// ========== CARGAR HISTORIAL DE FRASES ANALIZADAS ==========
async function loadDetectionHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/detection-history`);
        const history = await response.json();

        if (!history || history.length === 0) {
            container.innerHTML = '<div class="no-history">📝 No has analizado ningún mensaje todavía.<br>¡Prueba analizar algunas frases!</div>';
            return;
        }

        container.innerHTML = history.map(item => {
            const categoryClass = item.category === 'harmless' ? 'harmless' :
                                   item.category === 'mild' ? 'mild' :
                                   item.category === 'serious' ? 'serious' : 'hate';

            const categoryLabel = item.category === 'harmless' ? 'Inofensivo' :
                                  item.category === 'mild' ? 'Ofensivo Leve' :
                                  item.category === 'serious' ? 'Ofensivo Grave' : 'Discurso de Odio';

            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            return `
                <div class="history-item ${categoryClass}">
                    <div class="history-text">"${item.original_text || item.detected_word}"</div>
                    <div class="history-meta">
                        <span class="history-category ${categoryClass}">${categoryLabel}</span>
                        <span>📅 ${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.log('No se pudo cargar el historial');
        container.innerHTML = '<div class="no-history">No se pudo cargar el historial</div>';
    }
}

// ========== MANEJAR EL ANÁLISIS DEL MENSAJE ==========
// ========== VERIFICAR ROL DE USUARIO ==========
function getCurrentUserRole() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        return user.role || 'user';
    }
    return 'user';
}

function getCurrentUser() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        return JSON.parse(currentUser);
    }
    return null;
}

// Actualizar navbar según el rol
function updateNavbarByRole() {
    const user = getCurrentUser();
    if (!user) return;

    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    // Agregar indicador de rol
    const roleIndicator = document.getElementById('roleIndicator');
    if (!roleIndicator) {
        const newIndicator = document.createElement('span');
        newIndicator.id = 'roleIndicator';
        newIndicator.className = 'role-indicator';
        newIndicator.style.cssText = `
            background: ${user.role === 'admin' ? '#667eea' : '#48bb78'};
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            font-size: 0.75rem;
            margin-right: 1rem;
        `;
        newIndicator.textContent = user.role === 'admin' ? '👑 Admin' : '👤 Usuario';
        navMenu.insertBefore(newIndicator, navMenu.firstChild);
    }
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
    const supervisionSection = document.querySelector('.supervision-section');
    const recommendationsSection = document.getElementById('recommendationsSection');
    const resourcesSection = document.getElementById('resourcesSection');
    const refreshPendingBtn = document.getElementById('refreshPendingBtn');
    const addManualPendingBtn = document.getElementById('addManualPendingBtn');
    const manualWordInput = document.getElementById('manualWordInput');
    const manualCategoryInput = document.getElementById('manualCategoryInput');
    const manualMapsToInput = document.getElementById('manualMapsToInput');

    const userRole = getCurrentUserRole();

    // Actualizar navbar con el rol
    updateNavbarByRole();

    // Ocultar sección de estadísticas si no es admin
    const statsSection = document.getElementById('adminStatsSection');
    if (statsSection && userRole !== 'admin') {
        statsSection.style.display = 'none';
    }

    // Ocultar recomendaciones/recursos en vista admin
    if (userRole === 'admin') {
        if (recommendationsSection) recommendationsSection.style.display = 'none';
        if (resourcesSection) resourcesSection.style.display = 'none';
    }

    // Ocultar sección de supervisión si no es admin
    if (supervisionSection && userRole !== 'admin') {
        supervisionSection.style.display = 'none';
    }

    // Cargar palabras desde BD al iniciar
    await loadWordsFromDatabase();
    console.log('✅ Sistema listo para detectar cyberbullying');

    // Cargar palabras pendientes solo si es admin
    if (userRole === 'admin') {
        await loadStatistics();
        await loadPendingWordsUI();
        await loadLearnedWordsUI();
        await loadLearningCurveChart();

        // Auto-actualización de vista admin
        setInterval(async () => {
            await loadStatistics();
            await loadPendingWordsUI();
            await loadLearnedWordsUI();
            await loadLearningCurveChart();
        }, 10000);

        if (refreshPendingBtn) {
            refreshPendingBtn.addEventListener('click', async function() {
                await loadPendingWordsUI();
                await loadStatistics();
                await loadLearnedWordsUI();
                await loadLearningCurveChart();
            });
        }

        if (addManualPendingBtn) {
            addManualPendingBtn.addEventListener('click', async function() {
                const word = (manualWordInput?.value || '').trim();
                const category = (manualCategoryInput?.value || 'cyberbullying_variant').trim();
                const mapsTo = (manualMapsToInput?.value || '').trim();
                if (!word) {
                    alert('Ingresa una palabra para enviar a revisión');
                    return;
                }

                await saveWordAsPending(word, category, 0.9, mapsTo || null, 'alta manual admin', 'admin_manual');
                if (manualWordInput) manualWordInput.value = '';
                if (manualMapsToInput) manualMapsToInput.value = '';
                await loadPendingWordsUI();
                await loadStatistics();
                await loadLearnedWordsUI();
                await loadLearningCurveChart();
            });
        }
    } else {
        // Cargar historial para usuarios regulares
        await loadDetectionHistory();
    }

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

            // Refrescar panel admin cuando se generan nuevos pendientes
            if (userRole === 'admin') {
                await loadPendingWordsUI();
                await loadStatistics();
            }
            
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
            
            // Mostrar palabras pendientes según el rol
            if (result.hiddenWordsFound && result.hiddenWordsFound.length > 0) {
                const learnDiv = document.createElement('div');
                learnDiv.className = 'learning-notice';
                learnDiv.style.marginTop = '10px';
                learnDiv.style.padding = '10px';
                learnDiv.style.borderRadius = '5px';

                if (userRole === 'admin') {
                    learnDiv.style.backgroundColor = '#fffaf0';
                    learnDiv.style.borderLeft = '4px solid #dd6b20';
                    learnDiv.innerHTML = '<strong>📝 Palabras detectadas pendientes de revisión</strong><br>' +
                        'Las siguientes palabras han sido detectadas y requieren tu aprobación:<br>' +
                        result.hiddenWordsFound.map(h => `"${h.hidden}" → "${h.original}"`).join(', ') +
                        '<br><small>Ve a la sección "Supervisión de Aprendizaje" para aprobar o rechazar estas palabras.</small>';
                } else {
                    learnDiv.style.backgroundColor = '#e7f3ff';
                    learnDiv.style.borderLeft = '4px solid #2196F3';
                    learnDiv.innerHTML = '<strong>🔍 Palabras detectadas enviadas para revisión</strong><br>' +
                        'Las siguientes palabras han sido detectadas y enviadas a revisión:<br>' +
                        result.hiddenWordsFound.map(h => `"${h.hidden}" → "${h.original}"`).join(', ') +
                        '<br><small>Un administrador revisará estas palabras para mejorar el sistema.</small>';
                }
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
