// Analyzer dedicated for index.html (independent from OpenAI)
(function () {
  window.__INDEX_ANALYZER_ACTIVE__ = true;
  const API_URL = 'http://localhost:3000/api';
  let learnedWordsCache = [];

  async function loadLearnedWords() {
    try {
      const res = await fetch(`${API_URL}/learned-words`);
      if (!res.ok) return;
      learnedWordsCache = await res.json();
    } catch (_) {}
  }

  function classifyMessage(text) {
    const lower = text.toLowerCase();
    const offensiveWords = ['idiota', 'estupido', 'estúpido', 'tonto', 'feo', 'gordo', 'inutil', 'inútil', 'perdedor', 'bruto'];
    const hateWords = ['odio', 'asco', 'desprecio', 'eliminar', 'matar', 'muerte', 'violar'];
    const threatWords = ['te voy a', 'vas a ver', 'te arrepentiras', 'te arrepentirás', 'amenazo'];

    const learnedByCategory = {
      insulto: [],
      discurso_odio: [],
      amenaza: [],
      cyberbullying_variant: [],
      otros: [],
    };

    for (const w of learnedWordsCache) {
      const word = (w.word || '').toLowerCase();
      const cat = (w.category || '').toLowerCase();
      if (!word || cat === 'inofensivo') continue;
      if (learnedByCategory[cat]) learnedByCategory[cat].push(word);
      else learnedByCategory.otros.push(word);
    }

    const learnedOffensive = [
      ...learnedByCategory.insulto,
      ...learnedByCategory.discurso_odio,
      ...learnedByCategory.amenaza,
      ...learnedByCategory.cyberbullying_variant,
      ...learnedByCategory.otros,
    ];

    const learnedSafe = learnedWordsCache
      .filter((w) => (w.category || '').toLowerCase() === 'inofensivo')
      .map((w) => (w.word || '').toLowerCase())
      .filter(Boolean);

    const detected = [];
    let classification = 'harmless';
    let confidence = 15;
    let explanation = 'El mensaje no contiene lenguaje ofensivo detectable.';
    let suggestions = 'Continua comunicandote de manera respetuosa.';

    for (const w of threatWords) {
      if (lower.includes(w)) detected.push(`Amenaza: "${w}"`);
    }
    for (const w of hateWords) {
      if (lower.includes(w) && !detected.some((d) => d.includes(w))) detected.push(`Discurso de odio: "${w}"`);
    }
    for (const w of offensiveWords) {
      if (lower.includes(w) && !detected.some((d) => d.includes(w))) detected.push(`Insulto: "${w}"`);
    }
    for (const w of learnedByCategory.amenaza) {
      if (lower.includes(w) && !detected.some((d) => d.includes(w))) detected.push(`Amenaza (aprendida): "${w}"`);
    }
    for (const w of learnedByCategory.discurso_odio) {
      if (lower.includes(w) && !detected.some((d) => d.includes(w))) detected.push(`Discurso de odio (aprendida): "${w}"`);
    }
    for (const w of [...learnedByCategory.insulto, ...learnedByCategory.cyberbullying_variant, ...learnedByCategory.otros]) {
      if (lower.includes(w) && !detected.some((d) => d.includes(w))) detected.push(`Insulto (aprendida): "${w}"`);
    }
    for (const w of learnedSafe) {
      if (lower.includes(w)) {
        const idx = detected.findIndex((d) => d.toLowerCase().includes(`"${w}"`));
        if (idx >= 0) detected.splice(idx, 1);
      }
    }

    const hasThreat = detected.some((d) => d.startsWith('Amenaza'));
    const hasHate = detected.some((d) => d.startsWith('Discurso de odio'));
    const insults = detected.filter((d) => d.startsWith('Insulto')).length;

    if (hasThreat) {
      classification = 'hate';
      confidence = 95;
      explanation = 'El mensaje contiene lenguaje amenazante y de alto riesgo.';
      suggestions = 'No respondas, guarda evidencia y busca apoyo de un adulto o autoridad.';
    } else if (hasHate) {
      classification = 'hate';
      confidence = 90;
      explanation = 'El mensaje contiene expresiones de odio o desprecio.';
      suggestions = 'Evita escalar el conflicto y reporta el contenido en la plataforma.';
    } else if (insults >= 2) {
      classification = 'serious';
      confidence = 78;
      explanation = 'El mensaje contiene lenguaje ofensivo grave.';
      suggestions = 'Reformula el mensaje sin insultos ni agresiones.';
    } else if (insults === 1) {
      classification = 'mild';
      confidence = 62;
      explanation = 'El mensaje contiene lenguaje ofensivo leve.';
      suggestions = 'Piensa en el impacto de tus palabras y usa un tono respetuoso.';
    }

    return {
      classification,
      explanation,
      detected: detected.length ? detected : ['No se detecto contenido ofensivo especifico'],
      suggestions,
      confidence,
    };
  }

  function labelFor(classification) {
    const labels = {
      harmless: 'INOFENSIVO',
      mild: 'OFENSIVO LEVE',
      serious: 'OFENSIVO GRAVE',
      hate: 'DISCURSO DE ODIO',
    };
    return labels[classification] || classification.toUpperCase();
  }

  async function postJson(url, body) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (_) {}
  }

  function renderResult(result) {
    const badge = document.getElementById('classificationBadge');
    const text = document.getElementById('classificationText');
    const explanation = document.getElementById('explanationText');
    const list = document.getElementById('detectionsList');
    const suggestions = document.getElementById('suggestionsText');
    const confidence = document.getElementById('confidenceText');

    if (!badge || !text || !explanation || !list || !suggestions || !confidence) return;

    badge.className = 'classification-badge';
    badge.classList.add(result.classification);
    text.textContent = labelFor(result.classification);
    explanation.textContent = result.explanation;
    suggestions.textContent = result.suggestions;
    confidence.textContent = `Confianza: ${result.confidence}%`;

    list.innerHTML = '';
    for (const item of result.detected) {
      const div = document.createElement('div');
      div.className = 'detection-item';
      div.textContent = item;
      list.appendChild(div);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const input = document.getElementById('messageInput');
    const results = document.getElementById('resultsContainer');
    const welcome = document.getElementById('welcomeMessage');
    const count = document.getElementById('charCount');

    if (!analyzeBtn || !input || !results || !welcome) return;

    loadLearnedWords();

    analyzeBtn.onclick = async function () {
      const message = input.value.trim();
      if (!message) return;

      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analizando...';

      const result = classifyMessage(message);
      renderResult(result);
      welcome.classList.add('hidden');
      results.classList.remove('hidden');

      await postJson(`${API_URL}/register-detection`, {
        originalText: message,
        detectedWord: result.detected.join(', ') || 'ninguna',
        category: result.classification,
        confidence: result.confidence / 100,
        wasHidden: false,
      });

      // Supervisado: enviar hallazgos a pendientes
      for (const item of result.detected) {
        const m = item.match(/"([^"]+)"/);
        if (m && (item.startsWith('Insulto') || item.startsWith('Discurso de odio') || item.startsWith('Amenaza'))) {
          let pendingCategory = 'cyberbullying_variant';
          if (item.startsWith('Amenaza')) pendingCategory = 'amenaza';
          else if (item.startsWith('Discurso de odio')) pendingCategory = 'discurso_odio';
          else if (item.startsWith('Insulto')) pendingCategory = 'insulto';

          await postJson(`${API_URL}/pending`, {
            word: m[1].toLowerCase(),
            category: pendingCategory,
            confidence: result.confidence / 100,
            mapsTo: m[1].toLowerCase(),
            detectedText: message,
            source: 'user_input',
          });
        }
      }

      // Refrescar estadísticas del index tras cada análisis
      try {
        if (typeof loadStatistics === 'function') await loadStatistics();
        if (typeof loadWeeklyStats === 'function') await loadWeeklyStats();
        if (typeof loadTopWords === 'function') await loadTopWords();
      } catch (_) {}

      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analizar Mensaje';
    };

    if (clearBtn) {
      clearBtn.onclick = function () {
        input.value = '';
        if (count) count.textContent = '0';
        results.classList.add('hidden');
        welcome.classList.remove('hidden');
      };
    }

    input.addEventListener('input', function () {
      if (count) count.textContent = String(input.value.length);
    });
  });
})();
