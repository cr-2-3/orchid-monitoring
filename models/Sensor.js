// models/Sensor.js
// FIX: reescrito de ESM (import/export) a CommonJS (require/module.exports)
// FIX: agregados métodos faltantes que usa app.js: getActive(), create() completo

const db = require('../config/database');

class Sensor {
    static async getAll() {
        const [rows] = await db.query('SELECT * FROM sensors ORDER BY created_at DESC');
        return rows;
    }

    static async getActive() {
        const [rows] = await db.query(
            "SELECT * FROM sensors WHERE status = 'active' ORDER BY name ASC"
        );
        return rows;
    }

    static async getById(id) {
        const [rows] = await db.query('SELECT * FROM sensors WHERE id = ?', [id]);
        return rows[0];
    }

    static async create({ name, type, connection_type, mac_address, location }) {
        // Validar MAC address único
        const [existing] = await db.query(
            'SELECT id FROM sensors WHERE mac_address = ?', [mac_address]
        );
        if (existing.length > 0) {
            throw new Error('MAC address ya registrada en el sistema');
        }

        const [result] = await db.query(
            `INSERT INTO sensors (name, type, connection_type, mac_address, location, status)
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [name, type, connection_type, mac_address, location]
        );
        return { id: result.insertId, name, type, connection_type, mac_address, location };
    }

    static async updateStatus(id, status) {
        const [result] = await db.query(
            'UPDATE sensors SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM sensors WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async count() {
        const [result] = await db.query('SELECT COUNT(*) as total FROM sensors');
        return result[0].total;
    }
}

module.exports = Sensor;
