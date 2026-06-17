// models/Schedule.js
// Modelo para la gestión de horarios de riego

const db = require('../config/database');

class Schedule {
    /**
     * Obtener todos los horarios
     */
    static async getAll() {
        try {
            const [rows] = await db.query(
                'SELECT * FROM watering_schedule ORDER BY time ASC'
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener horarios:', error);
            throw error;
        }
    }

    /**
     * Obtener horarios activos
     */
    static async getActive() {
        try {
            const [rows] = await db.query(
                'SELECT * FROM watering_schedule WHERE active = TRUE ORDER BY time ASC'
            );
            return rows;
        } catch (error) {
            console.error('Error al obtener horarios activos:', error);
            throw error;
        }
    }

    /**
     * Obtener horario por ID
     */
    static async getById(id) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM watering_schedule WHERE id = ?',
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error al obtener horario por ID:', error);
            throw error;
        }
    }

    /**
     * Crear nuevo horario
     */
    static async create(scheduleData) {
        try {
            const { name, days_of_week, time, active = true, notes } = scheduleData;
            
            const [result] = await db.query(
                `INSERT INTO watering_schedule (name, days_of_week, time, active, notes) 
                 VALUES (?, ?, ?, ?, ?)`,
                [name, days_of_week, time, active, notes]
            );

            return {
                id: result.insertId,
                ...scheduleData
            };
        } catch (error) {
            console.error('Error al crear horario:', error);
            throw error;
        }
    }

    /**
     * Actualizar horario
     */
    static async update(id, scheduleData) {
        try {
            const { name, days_of_week, time, active, notes } = scheduleData;
            
            const [result] = await db.query(
                `UPDATE watering_schedule 
                 SET name = ?, days_of_week = ?, time = ?, active = ?, notes = ?, updated_at = NOW()
                 WHERE id = ?`,
                [name, days_of_week, time, active, notes, id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al actualizar horario:', error);
            throw error;
        }
    }

    /**
     * Activar/Desactivar horario
     */
    static async toggleActive(id, active) {
        try {
            const [result] = await db.query(
                'UPDATE watering_schedule SET active = ?, updated_at = NOW() WHERE id = ?',
                [active, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al cambiar estado del horario:', error);
            throw error;
        }
    }

    /**
     * Eliminar horario
     */
    static async delete(id) {
        try {
            const [result] = await db.query(
                'DELETE FROM watering_schedule WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error al eliminar horario:', error);
            throw error;
        }
    }

    /**
     * Obtener horarios para hoy
     */
    static async getTodaySchedules() {
        try {
            const today = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.
            
            const [rows] = await db.query(`
                SELECT * FROM watering_schedule 
                WHERE active = TRUE 
                AND FIND_IN_SET(?, days_of_week) > 0
                ORDER BY time ASC
            `, [today]);
            
            return rows;
        } catch (error) {
            console.error('Error al obtener horarios de hoy:', error);
            throw error;
        }
    }

    /**
     * Verificar si debe notificar ahora
     */
    static async shouldNotifyNow() {
        try {
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = now.toTimeString().slice(0, 5); // HH:MM
            
            const [rows] = await db.query(`
                SELECT * FROM watering_schedule 
                WHERE active = TRUE 
                AND FIND_IN_SET(?, days_of_week) > 0
                AND time = ?
            `, [currentDay, currentTime]);
            
            return rows;
        } catch (error) {
            console.error('Error al verificar notificaciones:', error);
            throw error;
        }
    }

    /**
     * Crear notificación
     */
    static async createNotification(scheduleId) {
        try {
            const [result] = await db.query(
                `INSERT INTO watering_notifications 
                 (schedule_id, notification_date, notification_time, status) 
                 VALUES (?, CURDATE(), CURTIME(), 'sent')`,
                [scheduleId]
            );

            return {
                id: result.insertId,
                schedule_id: scheduleId
            };
        } catch (error) {
            console.error('Error al crear notificación:', error);
            throw error;
        }
    }

    /**
     * Obtener notificaciones recientes
     */
    static async getRecentNotifications(limit = 20) {
        try {
            const [rows] = await db.query(`
                SELECT n.*, s.name as schedule_name
                FROM watering_notifications n
                JOIN watering_schedule s ON n.schedule_id = s.id
                ORDER BY n.created_at DESC
                LIMIT ?
            `, [parseInt(limit)]);
            
            return rows;
        } catch (error) {
            console.error('Error al obtener notificaciones recientes:', error);
            throw error;
        }
    }

    /**
     * Obtener próxima ejecución de un horario
     */
    static async getNextExecution(id) {
        try {
            const schedule = await this.getById(id);
            if (!schedule || !schedule.active) {
                return null;
            }

            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = now.toTimeString().slice(0, 5);
            
            const scheduleDays = schedule.days_of_week.split(',').map(d => parseInt(d));
            const scheduleTime = schedule.time.slice(0, 5);

            // Encontrar el próximo día de ejecución
            let daysUntilNext = null;
            for (let i = 0; i < 7; i++) {
                const checkDay = (currentDay + i) % 7;
                if (scheduleDays.includes(checkDay)) {
                    if (i === 0 && scheduleTime > currentTime) {
                        // Hoy pero más tarde
                        daysUntilNext = 0;
                        break;
                    } else if (i > 0) {
                        // Otro día
                        daysUntilNext = i;
                        break;
                    }
                }
            }

            if (daysUntilNext === null) {
                return null;
            }

            const nextDate = new Date(now);
            nextDate.setDate(nextDate.getDate() + daysUntilNext);
            
            const [hours, minutes] = scheduleTime.split(':');
            nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            return nextDate;
        } catch (error) {
            console.error('Error al calcular próxima ejecución:', error);
            throw error;
        }
    }

    /**
     * Validar días de la semana
     */
    static validateDaysOfWeek(daysString) {
        if (!daysString || typeof daysString !== 'string') {
            return false;
        }

        const days = daysString.split(',');
        return days.every(day => {
            const num = parseInt(day.trim());
            return !isNaN(num) && num >= 0 && num <= 6;
        });
    }

    /**
     * Formatear días para mostrar
     */
    static formatDaysOfWeek(daysString) {
        const dayNames = {
            '0': 'Dom', '1': 'Lun', '2': 'Mar',
            '3': 'Mié', '4': 'Jue', '5': 'Vie', '6': 'Sáb'
        };

        if (!daysString) return '';

        const days = daysString.split(',');
        return days.map(d => dayNames[d.trim()] || '').join(', ');
    }

    /**
     * Contar horarios totales
     */
    static async count() {
        try {
            const [result] = await db.query(
                'SELECT COUNT(*) as total FROM watering_schedule'
            );
            return result[0].total;
        } catch (error) {
            console.error('Error al contar horarios:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de horarios
     */
    static async getStatistics() {
        try {
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN active = TRUE THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN active = FALSE THEN 1 ELSE 0 END) as inactive
                FROM watering_schedule
            `);
            return stats[0];
        } catch (error) {
            console.error('Error al obtener estadísticas de horarios:', error);
            throw error;
        }
    }
}

module.exports = Schedule;