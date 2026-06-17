// models/Sensor.js
// Modelo para la gestión de sensores IoT

const { promisePool: db } = require('../config/database');

class Sensor {
    /**
     * Obtener todos los sensores
     */
    static async getAll() {
        try {
            const [rows] = await db.query('SELECT * FROM sensors ORDER BY created_at DESC');
            return rows;
        } catch (error) {
            console.error('Error al obtener sensores:', error);
            throw error;
        }
    }

    /**
     * Obtener sensores activos
     */
    static async getActive() {
        try {
            const [rows] = await db.query(
                'SELECT * FROM sensors WHERE status = ? ORDER BY created_at DESC',
                ['active']
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener sensores activos:', error);
            throw error;
        }
    }

    /**
     * Obtener un sensor por ID
     */
    static async getById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM sensors WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            console.error('Error al obtener sensor por ID:', error);
            throw error;
        }
    }

    /**
     * Obtener sensor por dirección MAC
     */
    static async getByMacAddress(macAddress) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM sensors WHERE mac_address = ?',
                [macAddress]
            );
            return rows[0];
        } catch (error) {
            console.error('Error al obtener sensor por MAC:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo sensor
     */
    static async create(sensorData) {
        try {
            const { name, type, connection_type, mac_address, location } = sensorData;
            
            // Verificar si ya existe un sensor con esa MAC
            const existing = await this.getByMacAddress(mac_address);
            if (existing) {
                throw new Error('Ya existe un sensor con esa dirección MAC');
            }

            const [result] = await db.query(
                `INSERT INTO sensors (name, type, connection_type, mac_address, location, status) 
                 VALUES (?, ?, ?, ?, ?, 'active')`,
                [name, type, connection_type, mac_address, location]
            );

            return {
                id: result.insertId,
                ...sensorData,
                status: 'active'
            };
        } catch (error) {
            console.error('Error al crear sensor:', error);
            throw error;
        }
    }

    /**
     * Actualizar sensor
     */
    static async update(id, sensorData) {
        try {
            const { name, type, connection_type, mac_address, location, status } = sensorData;
            
            const [result] = await db.query(
                `UPDATE sensors 
                 SET name = ?, type = ?, connection_type = ?, mac_address = ?, 
                     location = ?, status = ?, updated_at = NOW()
                 WHERE id = ?`,
                [name, type, connection_type, mac_address, location, status, id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al actualizar sensor:', error);
            throw error;
        }
    }

    /**
     * Cambiar estado del sensor
     */
    static async updateStatus(id, status) {
        try {
            const [result] = await db.query(
                'UPDATE sensors SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al actualizar estado del sensor:', error);
            throw error;
        }
    }

    /**
     * Eliminar sensor
     */
    static async delete(id) {
        try {
            const [result] = await db.query('DELETE FROM sensors WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al eliminar sensor:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de sensores
     */
    static async getStatistics() {
        try {
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
                FROM sensors
            `);
            return stats[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de sensores:', error);
            throw error;
        }
    }
}

module.exports = Sensor;