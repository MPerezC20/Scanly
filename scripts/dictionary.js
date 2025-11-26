// Datos del diccionario
const dictionaryData = [
    {
        id: 1,
        category: "insults",
        title: "Insultos Directos",
        description: "Palabras o frases que atacan directamente a la persona, su apariencia, inteligencia o capacidades.",
        examples: {
            bad: [
                "Eres un inútil total",
                "Qué feo/a eres",
                "Nadie te aguanta",
                "Eres el hazmerreír de todos"
            ],
            good: [
                "Podrías mejorar en esto",
                "Cada persona tiene su belleza única",
                "Todos tenemos cosas que aprender",
                "Tu esfuerzo es reconocido"
            ]
        },
        impact: "Los insultos directos pueden causar daño psicológico profundo y afectar la autoestima."
    },
    {
        id: 2,
        category: "discrimination",
        title: "Lenguaje Discriminatorio",
        description: "Comentarios que menosprecian o atacan a personas por su género, raza, orientación sexual, religión, etc.",
        examples: {
            bad: [
                "Los de tu raza siempre son así",
                "No juegues, eres mujer",
                "Gord@, mejor haz dieta",
                "Eres raro, no eres normal"
            ],
            good: [
                "Cada persona es única e importante",
                "Todos podemos participar sin importar género",
                "La salud es lo importante, no el peso",
                "La diversidad nos enriquece a todos"
            ]
        },
        impact: "Este lenguaje perpetúa estereotipos y puede generar exclusión social grave."
    },
    {
        id: 3,
        category: "threats",
        title: "Amenazas e Intimidación",
        description: "Comunicación que implica daño físico, psicológico o social hacia la persona.",
        examples: {
            bad: [
                "Ya verás en el colegio lo que te espera",
                "Te voy a hacer la vida imposible",
                "Vas a lamentar haber hablado",
                "Si no haces esto, pagarás las consecuencias"
            ],
            good: [
                "Hablemos para resolver esto",
                "Podemos encontrar una solución juntos",
                "Me gustaría que reconsideraras tu actitud",
                "Busquemos ayuda si no podemos resolverlo"
            ]
        },
        impact: "Las amenazas generan miedo, ansiedad y pueden escalar a situaciones peligrosas."
    },
    {
        id: 4,
        category: "exclusion",
        title: "Exclusión Social",
        description: "Acciones deliberadas para aislar o marginar a una persona de grupos o actividades.",
        examples: {
            bad: [
                "No invites a María al grupo",
                "Este chat es solo para los populares",
                "Nadie le hable a esa persona",
                "No queremos gente como tú aquí"
            ],
            good: [
                "Todos están invitados a participar",
                "Cuántos más, mejor",
                "Tu opinión también es importante",
                "Juntos creamos un mejor ambiente"
            ]
        },
        impact: "La exclusión puede causar soledad, depresión y afectar el desarrollo social."
    },
    {
        id: 5,
        category: "sexual",
        title: "Acoso Sexual Digital",
        description: "Comentarios, propuestas o insinuaciones de contenido sexual no deseadas.",
        examples: {
            bad: [
                "Envía una foto íntima",
                "Comentarios sobre el cuerpo no solicitados",
                "Insistir en citas después de un no",
                "Chistes sexuales ofensivos"
            ],
            good: [
                "Respetar siempre los límites personales",
                "Preguntar antes de hacer comentarios personales",
                "Aceptar un 'no' como respuesta",
                "Mantener conversaciones apropiadas"
            ]
        },
        impact: "Este comportamiento viola la privacidad y puede constituir delito."
    },
    {
        id: 6,
        category: "insults",
        title: "Burlas y Humillación",
        description: "Comentarios que ridiculizan o se burlan de situaciones personales o características.",
        examples: {
            bad: [
                "Jaja, mira cómo se viste",
                "Eres el hazmerreír de la clase",
                "Todos se ríen de ti",
                "Ni lo intentes, siempre fracasas"
            ],
            good: [
                "Tu estilo es único",
                "Todos tenemos momentos difíciles",
                "El esfuerzo es lo que cuenta",
                "Cada error es una oportunidad para aprender"
            ]
        },
        impact: "Las burlas constantes pueden destruir la confianza y autoestima."
    }
];

// Inicializar el diccionario
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando diccionario...');
    initializeDictionary();
    setupSearch();
    setupCategoryFilters();
});

function initializeDictionary() {
    const grid = document.getElementById('dictionaryGrid');
    if (!grid) {
        console.error('❌ No se encontró el elemento dictionaryGrid');
        return;
    }
    
    grid.innerHTML = '';
    console.log('📝 Cargando', dictionaryData.length, 'elementos del diccionario');
    
    dictionaryData.forEach(item => {
        const card = createDictionaryCard(item);
        grid.appendChild(card);
    });
}

function createDictionaryCard(item) {
    const card = document.createElement('div');
    card.className = `dictionary-card ${item.category}`;
    card.dataset.category = item.category;
    
    card.innerHTML = `
        <div class="card-category ${item.category}">
            ${getCategoryLabel(item.category)}
        </div>
        <div class="card-header">
            <h3>${item.title}</h3>
        </div>
        <p class="card-description">${item.description}</p>
        
        <div class="examples-section">
            <h4><i class="fas fa-times-circle"></i> Comportamiento de Riesgo</h4>
            <div class="examples-list">
                ${item.examples.bad.map(example => 
                    `<div class="example-item bad">${example}</div>`
                ).join('')}
            </div>
        </div>
        
        <div class="examples-section">
            <h4><i class="fas fa-check-circle"></i> Alternativa Positiva</h4>
            <div class="examples-list">
                ${item.examples.good.map(example => 
                    `<div class="example-item good">${example}</div>`
                ).join('')}
            </div>
        </div>
        
        <div class="impact-section">
            <h4>⚠️ Impacto Emocional</h4>
            <p>${item.impact}</p>
        </div>
    `;
    
    return card;
}

function getCategoryLabel(category) {
    const labels = {
        'insults': 'Insultos',
        'discrimination': 'Discriminación',
        'threats': 'Amenazas',
        'exclusion': 'Exclusión',
        'sexual': 'Acoso Sexual'
    };
    return labels[category] || category;
}

function setupSearch() {
    const searchInput = document.getElementById('searchDictionary');
    
    if (!searchInput) {
        console.error('❌ No se encontró el elemento searchDictionary');
        return;
    }
    
    console.log('🔍 Configurando búsqueda...');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        console.log('Buscando:', searchTerm);
        filterDictionary(searchTerm);
    });
}

function setupCategoryFilters() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    if (navButtons.length === 0) {
        console.error('❌ No se encontraron botones de navegación');
        return;
    }
    
    console.log('🎯 Configurando filtros de categoría...');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Botón clickeado:', this.dataset.category);
            
            // Remover active de todos los botones
            navButtons.forEach(btn => btn.classList.remove('active'));
            // Agregar active al botón clickeado
            this.classList.add('active');
            
            const category = this.dataset.category;
            filterByCategory(category);
        });
    });
}

function filterDictionary(searchTerm) {
    const cards = document.querySelectorAll('.dictionary-card');
    let visibleCount = 0;
    
    console.log('🔍 Filtrando por término:', searchTerm);
    
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.card-description').textContent.toLowerCase();
        const examples = card.textContent.toLowerCase();
        
        const matches = title.includes(searchTerm) || 
                       description.includes(searchTerm) || 
                       examples.includes(searchTerm);
        
        if (matches || searchTerm === '') {
            card.style.display = 'block';
            card.style.opacity = '1';
            visibleCount++;
        } else {
            card.style.display = 'none';
            card.style.opacity = '0';
        }
    });
    
    console.log('📊 Elementos visibles:', visibleCount);
    
    // Mostrar mensaje si no hay resultados
    showNoResultsMessage(visibleCount === 0 && searchTerm !== '');
}

function filterByCategory(category) {
    const cards = document.querySelectorAll('.dictionary-card');
    let visibleCount = 0;
    
    console.log('🎯 Filtrando por categoría:', category);
    
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
            card.style.opacity = '1';
            visibleCount++;
        } else {
            card.style.display = 'none';
            card.style.opacity = '0';
        }
    });
    
    console.log('📊 Elementos visibles:', visibleCount);
    showNoResultsMessage(visibleCount === 0 && category !== 'all');
}

// Función para tracking de clicks en recursos (opcional)
function trackClick(resourceType) {
    console.log(`📊 Recurso clickeado: ${resourceType}`);
    // Aquí puedes agregar Google Analytics o otro sistema de tracking
    // Ejemplo: gtag('event', 'resource_click', { 'resource_type': resourceType });
}

function trackDownload(fileName) {
    console.log(`📥 Descarga iniciada: ${fileName}`);
    // Tracking para descargas
    // Ejemplo: gtag('event', 'download', { 'file_name': fileName });
}

function showNoResultsMessage(show) {
    let message = document.getElementById('noResultsMessage');
    
    if (show && !message) {
        message = document.createElement('div');
        message.id = 'noResultsMessage';
        message.className = 'no-results';
        message.innerHTML = `
            <div class="no-results-content">
                <i class="fas fa-search fa-3x"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos de búsqueda o selecciona una categoría diferente.</p>
            </div>
        `;
        
        // Agregar estilos inline para el mensaje
        message.style.cssText = `
            grid-column: 1 / -1;
            text-align: center;
            padding: 4rem 2rem;
            background: #f8fafc;
            border-radius: 20px;
            border: 2px dashed #e2e8f0;
        `;
        
        const noResultsContent = message.querySelector('.no-results-content');
        noResultsContent.style.cssText = `
            max-width: 400px;
            margin: 0 auto;
            color: #64748b;
        `;
        
        document.getElementById('dictionaryGrid').appendChild(message);
    } else if (!show && message) {
        message.remove();
    }
}

// Agregar estilos CSS para las animaciones
const style = document.createElement('style');
style.textContent = `
    .dictionary-card {
        transition: all 0.3s ease;
    }
    
    .no-results {
        animation: fadeIn 0.5s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);

console.log('✅ Dictionary.js cargado correctamente');