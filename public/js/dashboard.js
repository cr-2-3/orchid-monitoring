// public/js/dashboard.js
// Lógica del cliente para el dashboard en tiempo real

(function() {
    'use strict';

    // Variables globales
    let humidityChart, temperatureChart;
    let socket;

    /**
     * Inicializar conexión WebSocket
     */
    function initWebSocket() {
        socket = io();

        socket.on('connect', () => {
            console.log('✅ Conectado al servidor WebSocket');
            updateConnectionStatus(true);
        });

        socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor WebSocket');
            updateConnectionStatus(false);
        });

        socket.on('newReading', (data) => {
            console.log('Nueva lectura recibida:', data);
            handleNewReading(data);
        });

        socket.on('wateringNotification', (data) => {
            console.log('Notificación de riego:', data);
            showNotification(`🚿 Hora de riego: ${data.name}`, 'info');
        });
    }

    /**
     * Actualizar indicador de conexión
     */
    function updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (connected) {
                statusElement.textContent = '● Conectado';
                statusElement.className = 'status-badge status-active';
            } else {
                statusElement.textContent = '● Desconectado';
                statusElement.className = 'status-badge status-error';
            }
        }
    }

    /**
     * Manejar nueva lectura
     */
    function handleNewReading(reading) {
        // Actualizar valores actuales
        updateCurrentValues(reading);
        
        // Agregar al gráfico
        addDataToCharts(reading);
        
        // Actualizar tabla
        updateLiveTable(reading);
    }

    /**
     * Actualizar valores actuales
     */
    function updateCurrentValues(reading) {
        const humidityElement = document.getElementById('current-humidity');
        const tempElement = document.getElementById('current-temperature');
        const humidityProgress = document.getElementById('humidity-progress');
        const tempProgress = document.getElementById('temperature-progress');

        if (humidityElement && reading.humidity) {
            humidityElement.textContent = `${reading.humidity}%`;
            
            if (humidityProgress) {
                const percentage = (reading.humidity / 100) * 100;
                humidityProgress.style.width = `${percentage}%`;
            }
        }

        if (tempElement && reading.temperature) {
            tempElement.textContent = `${reading.temperature}°C`;
            
            if (tempProgress) {
                const percentage = ((reading.temperature - 10) / 20) * 100;
                tempProgress.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
            }
        }

        // Actualizar tiempo
        updateLastUpdateTime();
    }

    /**
     * Actualizar tiempo de última actualización
     */
    function updateLastUpdateTime() {
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = 'Hace 0s';
            
            let seconds = 0;
            const interval = setInterval(() => {
                seconds++;
                if (seconds < 60) {
                    element.textContent = `Hace ${seconds}s`;
                } else {
                    const minutes = Math.floor(seconds / 60);
                    element.textContent = `Hace ${minutes}m`;
                }
            }, 1000);

            // Limpiar intervalo anterior si existe
            if (element.dataset.interval) {
                clearInterval(parseInt(element.dataset.interval));
            }
            element.dataset.interval = interval;
        }
    }

    /**
     * Agregar datos a los gráficos
     */
    function addDataToCharts(reading) {
        const timestamp = new Date(reading.timestamp).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Actualizar gráfico de humedad
        if (humidityChart) {
            humidityChart.data.labels.push(timestamp);
            humidityChart.data.datasets[0].data.push(reading.humidity);

            // Mantener solo los últimos 20 puntos
            if (humidityChart.data.labels.length > 20) {
                humidityChart.data.labels.shift();
                humidityChart.data.datasets[0].data.shift();
            }

            humidityChart.update();
        }

        // Actualizar gráfico de temperatura
        if (temperatureChart) {
            temperatureChart.data.labels.push(timestamp);
            temperatureChart.data.datasets[0].data.push(reading.temperature);

            if (temperatureChart.data.labels.length > 20) {
                temperatureChart.data.labels.shift();
                temperatureChart.data.datasets[0].data.shift();
            }

            temperatureChart.update();
        }
    }

    /**
     * Actualizar tabla en vivo
     */
    function updateLiveTable(reading) {
        const tbody = document.getElementById('live-readings');
        if (!tbody) return;

        const humidityOk = reading.humidity >= 75 && reading.humidity <= 85;
        const tempOk = reading.temperature >= 18 && reading.temperature <= 24;
        const status = humidityOk && tempOk ? 'normal' : 'warning';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(reading.timestamp).toLocaleTimeString('es-CL')}</td>
            <td><strong>${reading.sensor_name || 'Sensor'}</strong></td>
            <td class="${humidityOk ? 'trend-up' : 'trend-down'}">${reading.humidity}%</td>
            <td class="${tempOk ? 'trend-up' : 'trend-down'}">${reading.temperature}°C</td>
            <td>
                <span class="status-badge ${status === 'normal' ? 'status-active' : 'status-warning'}">
                    ${status === 'normal' ? '✓ Óptimo' : '⚠ Alerta'}
                </span>
            </td>
        `;

        // Agregar al inicio de la tabla
        tbody.insertBefore(row, tbody.firstChild);

        // Mantener solo las últimas 10 filas
        while (tbody.children.length > 10) {
            tbody.removeChild(tbody.lastChild);
        }
    }

    /**
     * Obtener datos iniciales
     */
    async function fetchInitialData() {
        try {
            const response = await fetch('/api/readings/recent?limit=20');
            const readings = await response.json();

            if (readings && readings.length > 0) {
                // Actualizar con la última lectura
                handleNewReading(readings[0]);

                // Poblar gráficos con datos históricos
                populateChartsWithHistory(readings.reverse());
            }
        } catch (error) {
            console.error('Error al obtener datos iniciales:', error);
        }
    }

    /**
     * Poblar gráficos con historial
     */
    function populateChartsWithHistory(readings) {
        const labels = readings.map(r => 
            new Date(r.timestamp).toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
            })
        );

        const humidityData = readings.map(r => parseFloat(r.humidity));
        const temperatureData = readings.map(r => parseFloat(r.temperature));

        if (humidityChart) {
            humidityChart.data.labels = labels;
            humidityChart.data.datasets[0].data = humidityData;
            humidityChart.update();
        }

        if (temperatureChart) {
            temperatureChart.data.labels = labels;
            temperatureChart.data.datasets[0].data = temperatureData;
            temperatureChart.update();
        }
    }

    /**
     * Inicializar gráficos
     */
    function initCharts() {
        const humidityCanvas = document.getElementById('humidity-chart');
        const temperatureCanvas = document.getElementById('temperature-chart');

        if (humidityCanvas) {
            humidityChart = new Chart(humidityCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Humedad (%)',
                        data: [],
                        borderColor: 'rgb(6, 182, 212)',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: { beginAtZero: false, min: 60, max: 100 }
                    }
                }
            });
        }

        if (temperatureCanvas) {
            temperatureChart = new Chart(temperatureCanvas, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: [],
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: { beginAtZero: false, min: 10, max: 30 }
                    }
                }
            });
        }
    }

    /**
     * Mostrar notificación
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification alert-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Inicialización
     */
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🌺 Inicializando Dashboard...');

        // Inicializar componentes
        initCharts();
        initWebSocket();
        fetchInitialData();

        // Actualizar datos cada 5 segundos
        setInterval(fetchInitialData, 5000);
    });

})();