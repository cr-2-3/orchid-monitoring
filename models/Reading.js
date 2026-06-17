// models/Reading.js
// FIX: reescrito de ESM (import/export) a CommonJS (require/module.exports)
// FIX: agregados métodos faltantes: getWithAlerts(), getByPeriod(), getStatistics(), create() completo

const db = require('../config/database');

class Reading {
    static async getRecent(limit = 20) {
        const [rows] = await db.query(
            `SELECT r.*, s.name AS sensor_name
             FROM readings r
             JOIN sensors s ON r.sensor_id = s.id
             ORDER BY r.timestamp DESC
             LIMIT ?`,
            [parseInt(limit)]
        );
        return rows;
    }

    static async getWithAlerts(limit = 10) {
        const [rows] = await db.query(
            `SELECT r.*, s.name AS sensor_name
             FROM readings r
             JOIN sensors s ON r.sensor_id = s.id
             WHERE r.alert_triggered = TRUE
             ORDER BY r.timestamp DESC
             LIMIT ?`,
            [parseInt(limit)]
        );
        return rows;
    }

    static async getByPeriod(hours = 24) {
        const [rows] = await db.query(
            `SELECT r.*, s.name AS sensor_name
             FROM readings r
             JOIN sensors s ON r.sensor_id = s.id
             WHERE r.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
             ORDER BY r.timestamp DESC`,
            [parseInt(hours)]
        );
        return rows;
    }

    static async getStatistics(hours = 24) {
        const [rows] = await db.query(
            `SELECT
                s.name AS sensor_name,
                ROUND(AVG(r.humidity), 2)    AS avg_humidity,
                ROUND(MIN(r.humidity), 2)    AS min_humidity,
                ROUND(MAX(r.humidity), 2)    AS max_humidity,
                ROUND(AVG(r.temperature), 2) AS avg_temperature,
                ROUND(MIN(r.temperature), 2) AS min_temperature,
                ROUND(MAX(r.temperature), 2) AS max_temperature,
                COUNT(*)                     AS total_readings
             FROM readings r
             JOIN sensors s ON r.sensor_id = s.id
             WHERE r.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
             GROUP BY s.id, s.name`,
            [parseInt(hours)]
        );
        return rows;
    }

    static async create({ sensor_id, humidity, temperature }) {
        // Determinar si hay alerta (humedad fuera de 60-90%, temp fuera de 15-30°C)
        const alertTriggered =
            humidity < 60 || humidity > 90 ||
            temperature < 15 || temperature > 30;

        const [result] = await db.query(
            `INSERT INTO readings (sensor_id, humidity, temperature, alert_triggered)
             VALUES (?, ?, ?, ?)`,
            [sensor_id, humidity, temperature, alertTriggered]
        );

        return {
            id: result.insertId,
            sensor_id,
            humidity,
            temperature,
            alert_triggered: alertTriggered,
            timestamp: new Date()
        };
    }

    static async count() {
        const [result] = await db.query('SELECT COUNT(*) as total FROM readings');
        return result[0].total;
    }
}

module.exports = Reading;
