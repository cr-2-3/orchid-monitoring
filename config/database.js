// config/database.js
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'orchid_monitoring',
    port: parseInt(process.env.DB_PORT) || 3306,   // FIX: antes DB_PORT=3000 (incorrecto)
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err.message);
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error(`   → La BD '${process.env.DB_NAME}' no existe. Ejecuta database/schema.sql primero.`);
        }
        if (err.code === 'ECONNREFUSED') {
            console.error(`   → MySQL no está corriendo en ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   → Usuario o contraseña incorrectos. Revisa DB_USER y DB_PASSWORD en .env');
        }
    } else {
        console.log('✅ Conexión exitosa a MySQL');
        connection.release();
    }
});

pool.on('error', (err) => {
    console.error('Error en pool de conexiones:', err);
    if (err.code !== 'PROTOCOL_CONNECTION_LOST') throw err;
});

module.exports = {
    pool,
    promisePool,
    query: (sql, params) => promisePool.query(sql, params),
    execute: (sql, params) => promisePool.execute(sql, params)
};
