import mysql from 'mysql2/promise'
import 'dotenv/config'

const DB_NAME = process.env.DB_NAME || 'iot_db'

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00',
})

export const connectDB = async () => {
    try {
        const tempConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
        })
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
        await tempConn.end()

        const conn = await pool.getConnection()

        await conn.query(`
            CREATE TABLE IF NOT EXISTS devices (
                device_id  VARCHAR(50)  PRIMARY KEY,
                name       VARCHAR(100) NOT NULL,
                type       ENUM('light','fan','ac','sensor_hub') NOT NULL DEFAULT 'light',
                pin        INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS sensors (
                sensor_id  VARCHAR(50)  PRIMARY KEY,
                device_id  VARCHAR(50),
                name       VARCHAR(100) NOT NULL,
                type       ENUM('temperature','humidity','light','multi') NOT NULL DEFAULT 'multi',
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE SET NULL
            )
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS sensor_data_raw (
                id         BIGINT      AUTO_INCREMENT PRIMARY KEY,
                sensor_id  VARCHAR(50) NOT NULL,
                value_type VARCHAR(50) NOT NULL,
                value      FLOAT       NOT NULL,
                group_id   BIGINT      NOT NULL,
                device_id  VARCHAR(50),
                timestamp  DATETIME    DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sensor    (sensor_id),
                INDEX idx_group     (group_id),
                INDEX idx_valuetype (value_type),
                INDEX idx_timestamp (timestamp)
            )
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS sensor_data (
                id          BIGINT      AUTO_INCREMENT PRIMARY KEY,
                group_id    BIGINT      NOT NULL UNIQUE,
                device_id   VARCHAR(50),
                temperature FLOAT,
                humidity    FLOAT,
                light       INT,
                timestamp   DATETIME    DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sd_group     (group_id),
                INDEX idx_sd_timestamp (timestamp),
                INDEX idx_sd_device    (device_id)
            )
        `)

        await conn.query(`
            CREATE TABLE IF NOT EXISTS action_history (
                id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(36)  UNIQUE,
                device_id  VARCHAR(50)  NOT NULL,
                action     VARCHAR(50)  NOT NULL,
                status     VARCHAR(20)  NOT NULL,
                state      VARCHAR(20)  NOT NULL,
                timestamp  DATETIME     DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ah_request   (request_id),
                INDEX idx_ah_device    (device_id),
                INDEX idx_ah_action    (action),
                INDEX idx_ah_status    (status),
                INDEX idx_ah_timestamp (timestamp)
            )
        `)

        try {
            await conn.query(`ALTER TABLE action_history ADD COLUMN request_id VARCHAR(36) UNIQUE FIRST`)
            await conn.query(`ALTER TABLE action_history ADD INDEX idx_ah_request (request_id)`)
            console.log('[DB] Migration: đã thêm cột request_id vào action_history')
        } catch {
        }

        await conn.query(`
            CREATE TABLE IF NOT EXISTS device_state (
                device_id  VARCHAR(50) PRIMARY KEY,
                state      VARCHAR(20) NOT NULL DEFAULT 'off',
                updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
            )
        `)

        await conn.query(`
            INSERT IGNORE INTO devices (device_id, name, type, pin) VALUES
                ('light_1', 'Đèn phòng',  'light', 5),
                ('fan_1',   'Quạt phòng', 'fan',   4),
                ('ac_1',    'Điều hòa',   'ac',   13)
        `)

        await conn.query(`
            INSERT IGNORE INTO sensors (sensor_id, device_id, name, type) VALUES
                ('dht11_1', NULL, 'Cảm biến nhiệt độ & độ ẩm DHT11', 'multi'),
                ('ldr_1',   NULL, 'Cảm biến ánh sáng LDR',            'light')
        `)

        await conn.query(`
            INSERT IGNORE INTO device_state (device_id, state) VALUES
                ('light_1', 'off'),
                ('fan_1',   'off'),
                ('ac_1',    'off')
        `)

        conn.release()
        console.log(`DB Connected — database "${DB_NAME}" ready`)

    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

export default pool

