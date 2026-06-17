-- =====================================================================
-- Script de Creación de Base de Datos
-- Sistema de Monitoreo de Orquídeas
-- Versión: 1.0.0
-- Fecha: Diciembre 2024
-- =====================================================================

-- Eliminar base de datos si existe (CUIDADO EN PRODUCCIÓN)
DROP DATABASE IF EXISTS orchid_monitoring;

-- Crear base de datos
CREATE DATABASE orchid_monitoring 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE orchid_monitoring;

-- =====================================================================
-- TABLA: sensors
-- Descripción: Almacena información de los sensores IoT
-- =====================================================================
CREATE TABLE sensors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo del sensor',
    type ENUM('humidity', 'temperature', 'combined') NOT NULL COMMENT 'Tipo de sensor',
    connection_type ENUM('bluetooth', 'wifi') NOT NULL COMMENT 'Tipo de conexión',
    mac_address VARCHAR(17) UNIQUE NOT NULL COMMENT 'Dirección MAC del sensor',
    status ENUM('active', 'inactive', 'error') DEFAULT 'inactive' COMMENT 'Estado actual del sensor',
    location VARCHAR(255) COMMENT 'Ubicación física del sensor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de registro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
    
    INDEX idx_status (status),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de sensores IoT registrados en el sistema';

-- =====================================================================
-- TABLA: readings
-- Descripción: Registra todas las lecturas de los sensores
-- =====================================================================
CREATE TABLE readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sensor_id INT NOT NULL COMMENT 'ID del sensor que realizó la lectura',
    humidity DECIMAL(5,2) COMMENT 'Humedad relativa en porcentaje',
    temperature DECIMAL(5,2) COMMENT 'Temperatura en grados Celsius',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Momento de la lectura',
    alert_triggered BOOLEAN DEFAULT FALSE COMMENT 'Indica si se generó alerta',
    
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
    INDEX idx_sensor_timestamp (sensor_id, timestamp),
    INDEX idx_timestamp (timestamp),
    INDEX idx_alert (alert_triggered)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro histórico de lecturas de sensores';

-- =====================================================================
-- TABLA: watering_schedule
-- Descripción: Calendario de horarios de riego programados
-- =====================================================================
CREATE TABLE watering_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Nombre del horario',
    days_of_week VARCHAR(50) NOT NULL COMMENT 'Días de la semana (0-6 separados por comas)',
    time TIME NOT NULL COMMENT 'Hora del riego',
    active BOOLEAN DEFAULT TRUE COMMENT 'Si el horario está activo',
    notes TEXT COMMENT 'Notas adicionales',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
    
    INDEX idx_active_time (active, time),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Horarios de riego programados';

-- =====================================================================
-- TABLA: watering_notifications
-- Descripción: Registro de notificaciones de riego enviadas
-- =====================================================================
CREATE TABLE watering_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL COMMENT 'ID del horario asociado',
    notification_date DATE NOT NULL COMMENT 'Fecha de la notificación',
    notification_time TIME NOT NULL COMMENT 'Hora de la notificación',
    status ENUM('pending', 'sent', 'acknowledged') DEFAULT 'pending' COMMENT 'Estado de la notificación',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    
    FOREIGN KEY (schedule_id) REFERENCES watering_schedule(id) ON DELETE CASCADE,
    INDEX idx_status_date (status, notification_date),
    INDEX idx_schedule (schedule_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial de notificaciones de riego';

-- =====================================================================
-- TABLA: environmental_alerts
-- Descripción: Alertas generadas por condiciones fuera de rango
-- =====================================================================
CREATE TABLE environmental_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reading_id INT NOT NULL COMMENT 'ID de la lectura que generó la alerta',
    alert_type ENUM('humidity_low', 'humidity_high', 'temp_low', 'temp_high') NOT NULL COMMENT 'Tipo de alerta',
    value DECIMAL(5,2) NOT NULL COMMENT 'Valor que generó la alerta',
    threshold DECIMAL(5,2) NOT NULL COMMENT 'Umbral configurado',
    status ENUM('active', 'resolved', 'acknowledged') DEFAULT 'active' COMMENT 'Estado de la alerta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
    resolved_at TIMESTAMP NULL COMMENT 'Fecha de resolución',
    
    FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_type (alert_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Alertas ambientales del sistema';

-- =====================================================================
-- TABLA: system_config
-- Descripción: Configuración general del sistema
-- =====================================================================
CREATE TABLE system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'Clave de configuración',
    config_value VARCHAR(255) NOT NULL COMMENT 'Valor de configuración',
    description TEXT COMMENT 'Descripción del parámetro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
    
    INDEX idx_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuración del sistema';

-- =====================================================================
-- DATOS INICIALES: Configuración del Sistema
-- =====================================================================
INSERT INTO system_config (config_key, config_value, description) VALUES
('humidity_min', '75', 'Humedad mínima óptima (%)'),
('humidity_max', '85', 'Humedad máxima óptima (%)'),
('temp_min', '18', 'Temperatura mínima óptima (°C)'),
('temp_max', '24', 'Temperatura máxima óptima (°C)'),
('reading_frequency', '60', 'Frecuencia de lectura en minutos'),
('alert_enabled', '1', 'Alertas habilitadas (1=sí, 0=no)');

-- =====================================================================
-- DATOS DE PRUEBA: Sensores
-- =====================================================================
INSERT INTO sensors (name, type, connection_type, mac_address, status, location) VALUES
('Sensor Principal', 'combined', 'wifi', 'AA:BB:CC:DD:EE:01', 'active', 'Invernadero Principal'),
('Sensor Auxiliar', 'humidity', 'bluetooth', 'AA:BB:CC:DD:EE:02', 'active', 'Zona Este');

-- =====================================================================
-- DATOS DE PRUEBA: Horarios de Riego
-- =====================================================================
INSERT INTO watering_schedule (name, days_of_week, time, active, notes) VALUES
('Riego Matutino', '1,2,3,4,5', '08:00:00', TRUE, 'Riego diario de lunes a viernes'),
('Riego Nocturno', '2,4,6', '20:00:00', TRUE, 'Riego complementario en días alternos');

-- =====================================================================
-- DATOS DE PRUEBA: Lecturas (últimas 24 horas)
-- =====================================================================
INSERT INTO readings (sensor_id, humidity, temperature, timestamp) VALUES
(1, 78.5, 21.3, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 79.2, 21.8, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 80.1, 22.1, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(1, 81.3, 22.5, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(1, 77.8, 20.9, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(1, 78.9, 21.4, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(2, 77.8, 20.9, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 78.4, 21.2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 79.1, 21.6, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 80.2, 22.0, DATE_SUB(NOW(), INTERVAL 4 HOUR));

-- =====================================================================
-- VISTA: recent_readings_summary
-- Descripción: Resumen de lecturas recientes con estado calculado
-- =====================================================================
CREATE OR REPLACE VIEW recent_readings_summary AS
SELECT 
    s.name AS sensor_name,
    r.id,
    r.humidity,
    r.temperature,
    r.timestamp,
    r.alert_triggered,
    CASE 
        WHEN r.humidity < 75 OR r.humidity > 85 THEN 'warning'
        WHEN r.temperature < 18 OR r.temperature > 24 THEN 'warning'
        ELSE 'normal'
    END AS status
FROM readings r
JOIN sensors s ON r.sensor_id = s.id
WHERE r.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY r.timestamp DESC;

-- =====================================================================
-- STORED PROCEDURE: get_environmental_stats
-- Descripción: Obtiene estadísticas agregadas de un período
-- =====================================================================
DELIMITER //

CREATE PROCEDURE get_environmental_stats(IN hours INT)
BEGIN
    SELECT 
        AVG(humidity) as avg_humidity,
        MIN(humidity) as min_humidity,
        MAX(humidity) as max_humidity,
        AVG(temperature) as avg_temperature,
        MIN(temperature) as min_temperature,
        MAX(temperature) as max_temperature,
        COUNT(*) as total_readings,
        SUM(CASE WHEN alert_triggered = TRUE THEN 1 ELSE 0 END) as total_alerts
    FROM readings
    WHERE timestamp > DATE_SUB(NOW(), INTERVAL hours HOUR);
END //

DELIMITER ;

-- =====================================================================
-- TRIGGER: check_environmental_conditions
-- Descripción: Genera alertas automáticas cuando hay valores fuera de rango
-- =====================================================================
DELIMITER //

CREATE TRIGGER check_environmental_conditions
AFTER INSERT ON readings
FOR EACH ROW
BEGIN
    DECLARE hum_min DECIMAL(5,2);
    DECLARE hum_max DECIMAL(5,2);
    DECLARE temp_min DECIMAL(5,2);
    DECLARE temp_max DECIMAL(5,2);
    
    -- Obtener umbrales configurados
    SELECT CAST(config_value AS DECIMAL(5,2)) INTO hum_min 
    FROM system_config WHERE config_key = 'humidity_min';
    
    SELECT CAST(config_value AS DECIMAL(5,2)) INTO hum_max 
    FROM system_config WHERE config_key = 'humidity_max';
    
    SELECT CAST(config_value AS DECIMAL(5,2)) INTO temp_min 
    FROM system_config WHERE config_key = 'temp_min';
    
    SELECT CAST(config_value AS DECIMAL(5,2)) INTO temp_max 
    FROM system_config WHERE config_key = 'temp_max';
    
    -- Verificar humedad baja
    IF NEW.humidity IS NOT NULL AND NEW.humidity < hum_min THEN
        INSERT INTO environmental_alerts (reading_id, alert_type, value, threshold)
        VALUES (NEW.id, 'humidity_low', NEW.humidity, hum_min);
        
        UPDATE readings SET alert_triggered = TRUE WHERE id = NEW.id;
    END IF;
    
    -- Verificar humedad alta
    IF NEW.humidity IS NOT NULL AND NEW.humidity > hum_max THEN
        INSERT INTO environmental_alerts (reading_id, alert_type, value, threshold)
        VALUES (NEW.id, 'humidity_high', NEW.humidity, hum_max);
        
        UPDATE readings SET alert_triggered = TRUE WHERE id = NEW.id;
    END IF;
    
    -- Verificar temperatura baja
    IF NEW.temperature IS NOT NULL AND NEW.temperature < temp_min THEN
        INSERT INTO environmental_alerts (reading_id, alert_type, value, threshold)
        VALUES (NEW.id, 'temp_low', NEW.temperature, temp_min);
        
        UPDATE readings SET alert_triggered = TRUE WHERE id = NEW.id;
    END IF;
    
    -- Verificar temperatura alta
    IF NEW.temperature IS NOT NULL AND NEW.temperature > temp_max THEN
        INSERT INTO environmental_alerts (reading_id, alert_type, value, threshold)
        VALUES (NEW.id, 'temp_high', NEW.temperature, temp_max);
        
        UPDATE readings SET alert_triggered = TRUE WHERE id = NEW.id;
    END IF;
END //

DELIMITER ;

-- =====================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- =====================================================================

-- Índice para búsquedas por MAC address
ALTER TABLE sensors ADD INDEX idx_mac (mac_address);

-- Índice compuesto para consultas de alertas por tipo y estado
ALTER TABLE environmental_alerts 
ADD INDEX idx_type_status (alert_type, status);

-- Índice para notificaciones pendientes
ALTER TABLE watering_notifications 
ADD INDEX idx_pending (status, notification_date) 
WHERE status = 'pending';

-- =====================================================================
-- PROCEDIMIENTO: cleanup_old_data
-- Descripción: Limpia datos antiguos (mantenimiento)
-- =====================================================================
DELIMITER //

CREATE PROCEDURE cleanup_old_data(IN days_to_keep INT)
BEGIN
    DECLARE deleted_readings INT DEFAULT 0;
    DECLARE deleted_notifications INT DEFAULT 0;
    
    -- Eliminar lecturas antiguas
    DELETE FROM readings 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    SET deleted_readings = ROW_COUNT();
    
    -- Eliminar notificaciones antiguas
    DELETE FROM watering_notifications 
    WHERE notification_date < DATE_SUB(CURDATE(), INTERVAL days_to_keep DAY);
    
    SET deleted_notifications = ROW_COUNT();
    
    -- Retornar resumen
    SELECT 
        deleted_readings AS readings_deleted,
        deleted_notifications AS notifications_deleted,
        NOW() AS cleanup_timestamp;
END //

DELIMITER ;

-- =====================================================================
-- FUNCIÓN: calculate_optimal_range_percentage
-- Descripción: Calcula el porcentaje de lecturas en rango óptimo
-- =====================================================================
DELIMITER //

CREATE FUNCTION calculate_optimal_range_percentage(hours INT)
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total INT DEFAULT 0;
    DECLARE optimal INT DEFAULT 0;
    DECLARE percentage DECIMAL(5,2) DEFAULT 0.00;
    
    SELECT COUNT(*) INTO total
    FROM readings
    WHERE timestamp > DATE_SUB(NOW(), INTERVAL hours HOUR);
    
    IF total > 0 THEN
        SELECT COUNT(*) INTO optimal
        FROM readings
        WHERE timestamp > DATE_SUB(NOW(), INTERVAL hours HOUR)
        AND humidity BETWEEN 75 AND 85
        AND temperature BETWEEN 18 AND 24;
        
        SET percentage = (optimal / total) * 100;
    END IF;
    
    RETURN percentage;
END //

DELIMITER ;

-- =====================================================================
-- VERIFICACIÓN DE LA INSTALACIÓN
-- =====================================================================

-- Mostrar todas las tablas creadas
SELECT 
    'Tablas creadas correctamente' AS status,
    COUNT(*) AS total_tables
FROM information_schema.tables 
WHERE table_schema = 'orchid_monitoring';

-- Mostrar configuración inicial
SELECT 'Configuración inicial' AS info, config_key, config_value, description
FROM system_config;

-- Mostrar sensores de prueba
SELECT 'Sensores de prueba' AS info, id, name, type, status, location
FROM sensors;

-- Mostrar horarios de prueba
SELECT 'Horarios de prueba' AS info, id, name, days_of_week, time, active
FROM watering_schedule;

-- Mostrar lecturas de prueba
SELECT 'Lecturas de prueba' AS info, COUNT(*) AS total_readings
FROM readings;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================

SELECT '✅ Base de datos creada exitosamente' AS mensaje;
SELECT '📊 Tablas: 6' AS info;
SELECT '👁️ Vistas: 1' AS info;
SELECT '⚙️ Procedimientos: 2' AS info;
SELECT '🔧 Funciones: 1' AS info;
SELECT '⚡ Triggers: 1' AS info;