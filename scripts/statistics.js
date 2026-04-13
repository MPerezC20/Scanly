// statistics.js - Módulo de estadísticas
class StatisticsManager {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
    }

    // Cargar todas las estadísticas
    async loadAllStats() {
        try {
            const stats = await this.getGeneralStats();
            const weeklyStats = await this.getWeeklyStats();
            const topWords = await this.getTopWords();
            
            this.displayStats(stats);
            this.displayWeeklyChart(weeklyStats);
            this.displayTopWords(topWords);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showError('No se pudieron cargar las estadísticas');
        }
    }

    // Obtener estadísticas generales
    async getGeneralStats() {
        const response = await fetch(`${this.apiUrl}/statistics`);
        if (!response.ok) throw new Error('Error fetching stats');
        return await response.json();
    }

    // Obtener estadísticas semanales
    async getWeeklyStats() {
        const response = await fetch(`${this.apiUrl}/weekly-stats`);
        if (!response.ok) throw new Error('Error fetching weekly stats');
        return await response.json();
    }

    // Obtener palabras más comunes
    async getTopWords() {
        const response = await fetch(`${this.apiUrl}/top-words`);
        if (!response.ok) throw new Error('Error fetching top words');
        return await response.json();
    }

    // Mostrar estadísticas en el dashboard
    displayStats(stats) {
        document.getElementById('totalLearnedWords').textContent = stats.totalLearnedWords || 0;
        document.getElementById('totalDetections').textContent = stats.totalDetections || 0;
        
        // Calcular promedio de confianza
        if (stats.avgConfidence) {
            document.getElementById('avgConfidence').textContent = `${Math.round(stats.avgConfidence * 100)}%`;
        } else {
            document.getElementById('avgConfidence').textContent = '0%';
        }
    }

    // Mostrar gráfico semanal usando Canvas
    displayWeeklyChart(weeklyStats) {
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dates = weeklyStats.map(stat => stat.date.slice(5)); // MM-DD
        const detections = weeklyStats.map(stat => stat.detections);

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (dates.length === 0) {
            ctx.fillText('No hay datos disponibles', 150, 100);
            return;
        }

        // Dibujar gráfico de barras
        const barWidth = (canvas.width - 100) / dates.length - 10;
        const maxDetection = Math.max(...detections, 1);
        
        dates.forEach((date, i) => {
            const x = 60 + i * (barWidth + 10);
            const height = (detections[i] / maxDetection) * 150;
            const y = canvas.height - 50 - height;
            
            // Barra
            ctx.fillStyle = '#667eea';
            ctx.fillRect(x, y, barWidth, height);
            
            // Etiqueta
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText(date, x, canvas.height - 30);
            
            // Valor
            ctx.fillStyle = '#666';
            ctx.fillText(detections[i], x, y - 5);
        });
        
        // Título del gráfico
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Detecciones por día', 150, 20);
    }

    // Mostrar palabras más detectadas
    displayTopWords(topWords) {
        const container = document.getElementById('topWordsList');
        if (!container) return;

        if (!topWords || topWords.length === 0) {
            container.innerHTML = '<li>No hay palabras detectadas aún</li>';
            return;
        }

        container.innerHTML = topWords.map(word => `
            <li>
                <span class="word-badge">${word.detected_word}</span>
                <span class="count-badge">${word.times} veces</span>
            </li>
        `).join('');
    }

    // Mostrar error
    showError(message) {
        const statsSection = document.querySelector('.statistics-section');
        if (statsSection) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            statsSection.insertBefore(errorDiv, statsSection.firstChild);
            
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const statsManager = new StatisticsManager();
    statsManager.loadAllStats();
    
    // Recargar estadísticas cada 30 segundos
    setInterval(() => statsManager.loadAllStats(), 30000);
});