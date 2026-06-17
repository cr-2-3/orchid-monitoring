// app.js - Servidor Principal del Sistema de Monitoreo de Orquídeas
'use strict';

require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const path       = require('path');
const http       = require('http');
const socketIo   = require('socket.io');
const cron       = require('node-cron');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server);

const PORT = process.env.PORT || 3000;

// ==================== BASE DE DATOS ====================
// FIX: la conexión ahora usa config/database.js que lee DB_PORT correctamente (3306)
const db = require('./config/database');

// ==================== MODELOS ====================
// FIX: Sensor y Reading reescritos en CommonJS (eran ESM y crasheaban)
const Sensor  = require('./models/Sensor');
const Reading = require('./models/Reading');
const Schedule = require('./models/Schedule');

// ==================== MIDDLEWARE ====================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

app.set('io', io);

// ==================== VISTAS ====================

app.get('/', async (req, res) => {
    try {
        const sensors        = await Sensor.getActive();
        const recentReadings = await Reading.getRecent(10);
        const alertReadings  = await Reading.getWithAlerts(5);
        res.render('index', {
            title: 'Dashboard - Monitoreo de Orquídeas',
            sensors,
            recentReadings,
            alerts: alertReadings
        });
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).send('Error al cargar el dashboard');
    }
});

app.get('/dashboard', async (req, res) => {
    try {
        const [config] = await db.query('SELECT * FROM system_config');
        const configObj = {};
        config.forEach(item => { configObj[item.config_key] = item.config_value; });
        res.render('dashboard', { config: configObj, title: 'Monitoreo en Tiempo Real' });
    } catch (error) {
        // system_config puede no existir en todos los entornos
        res.render('dashboard', { config: {}, title: 'Monitoreo en Tiempo Real' });
    }
});

app.get('/schedule', async (req, res) => {
    try {
        const schedules = await Schedule.getAll();
        res.render('schedule', { schedules, title: 'Calendario de Riego' });
    } catch (error) {
        console.error('Error en schedule:', error);
        res.status(500).send('Error al cargar el calendario');
    }
});

app.get('/sensors', async (req, res) => {
    try {
        const sensors = await Sensor.getAll();
        res.render('sensors', { sensors, title: 'Gestión de Sensores' });
    } catch (error) {
        console.error('Error en sensors:', error);
        res.status(500).send('Error al cargar sensores');
    }
});

app.get('/history', async (req, res) => {
    try {
        const period   = req.query.period || '24';
        const readings = await Reading.getByPeriod(parseInt(period));
        res.render('history', { readings, period, title: 'Historial de Datos' });
    } catch (error) {
        console.error('Error en history:', error);
        res.status(500).send('Error al cargar historial');
    }
});

// ==================== API ====================

app.get('/api/readings/recent', async (req, res) => {
    try {
        const readings = await Reading.getRecent(req.query.limit || 50);
        res.json(readings);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener lecturas' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await Reading.getStatistics(req.query.hours || 24);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

app.post('/api/readings', async (req, res) => {
    try {
        const { sensor_id, humidity, temperature } = req.body;
        const reading = await Reading.create({ sensor_id, humidity, temperature });
        io.emit('newReading', reading);
        res.json({ success: true, id: reading.id });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear lectura' });
    }
});

app.get('/api/schedule', async (req, res) => {
    try {
        res.json(await Schedule.getAll());
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener horarios' });
    }
});

app.get('/api/schedule/:id', async (req, res) => {
    try {
        const schedule = await Schedule.getById(req.params.id);
        if (!schedule) return res.status(404).json({ error: 'Horario no encontrado' });
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener horario' });
    }
});

app.post('/api/schedule', async (req, res) => {
    try {
        const { name, days_of_week, time, notes } = req.body;
        if (!Schedule.validateDaysOfWeek(days_of_week)) {
            return res.status(400).json({ error: 'Formato de días inválido' });
        }
        const schedule = await Schedule.create({ name, days_of_week, time, notes });
        res.json({ success: true, id: schedule.id, message: 'Horario creado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear horario' });
    }
});

app.put('/api/schedule/:id', async (req, res) => {
    try {
        const { name, days_of_week, time, active, notes } = req.body;
        const success = await Schedule.update(req.params.id, { name, days_of_week, time, active, notes });
        if (!success) return res.status(404).json({ error: 'Horario no encontrado' });
        res.json({ success: true, message: 'Horario actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar horario' });
    }
});

app.delete('/api/schedule/:id', async (req, res) => {
    try {
        const success = await Schedule.delete(req.params.id);
        if (!success) return res.status(404).json({ error: 'Horario no encontrado' });
        res.json({ success: true, message: 'Horario eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar horario' });
    }
});

app.get('/api/sensors', async (req, res) => {
    try {
        res.json(await Sensor.getAll());
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener sensores' });
    }
});

app.post('/api/sensors', async (req, res) => {
    try {
        const { name, type, connection_type, mac_address, location } = req.body;
        const sensor = await Sensor.create({ name, type, connection_type, mac_address, location });
        res.json({ success: true, id: sensor.id, message: 'Sensor conectado exitosamente' });
    } catch (error) {
        if (error.message.includes('MAC')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error al crear sensor' });
    }
});

app.put('/api/sensors/:id', async (req, res) => {
    try {
        const { status, location } = req.body;
        const [result] = await db.query(
            'UPDATE sensors SET status = ?, location = ?, updated_at = NOW() WHERE id = ?',
            [status, location, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Sensor no encontrado' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar sensor' });
    }
});

app.delete('/api/sensors/:id', async (req, res) => {
    try {
        const success = await Sensor.delete(req.params.id);
        if (!success) return res.status(404).json({ error: 'Sensor no encontrado' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar sensor' });
    }
});

// ==================== TAREAS PROGRAMADAS ====================

cron.schedule('* * * * *', async () => {
    try {
        const now         = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const schedules   = await Schedule.shouldNotifyNow();

        for (const schedule of schedules) {
            console.log(`🚿 Riego: ${schedule.name} - ${currentTime}`);
            await Schedule.createNotification(schedule.id);
            io.emit('wateringNotification', {
                schedule_id: schedule.id,
                name: schedule.name,
                time: currentTime
            });
        }
    } catch (error) {
        console.error('Error en tarea de notificaciones:', error);
    }
});

if (process.env.ENABLE_SENSOR_SIMULATION === 'true') {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const sensors = await Sensor.getActive();
            for (const sensor of sensors) {
                const humidity    = (75 + Math.random() * 10).toFixed(2);
                const temperature = (18 + Math.random() * 6).toFixed(2);
                const reading     = await Reading.create({ sensor_id: sensor.id, humidity, temperature });
                io.emit('newReading', reading);
            }
            console.log('📊 Lecturas simuladas generadas');
        } catch (error) {
            console.error('Error generando lecturas simuladas:', error);
        }
    });
}

// ==================== WEBSOCKET ====================

io.on('connection', (socket) => {
    console.log('✅ Cliente WebSocket conectado');
    socket.on('disconnect', () => console.log('❌ Cliente WebSocket desconectado'));
});

// ==================== INICIAR ====================

server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════╗
    ║  🌺  Sistema de Monitoreo de Orquídeas  🌺       ║
    ║                                                  ║
    ║  http://localhost:${PORT}                           ║
    ║  /dashboard  /schedule  /sensors  /history       ║
    ╚══════════════════════════════════════════════════╝
    `);
});

module.exports = { app, io, db: db.promisePool };
