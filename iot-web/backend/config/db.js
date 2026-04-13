import mysql from 'mysql2/promise'
import 'dotenv/config'

const DB_NAME = process.env.DB_NAME || 'iot_db_v2'

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
    charset: 'utf8mb4',
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

        // 1. Tạo bảng Sensors (Danh mục cảm biến)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS sensors (
                sensor_id  VARCHAR(50)  PRIMARY KEY,
                name       VARCHAR(100) NOT NULL,
                type       VARCHAR(50)  NOT NULL DEFAULT 'unknown',
                created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            )
        `)

        // 2. Tạo bảng sensor_data (Bảng CHA)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS sensor_data (
                id              BIGINT      AUTO_INCREMENT PRIMARY KEY,
                message_id      BIGINT      NOT NULL UNIQUE,
                temperature     FLOAT,
                humidity        FLOAT,
                light           FLOAT,
                soil_moisture   FLOAT,
                created_at      DATETIME    DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_sd_message (message_id),
                INDEX idx_sd_created (created_at)
            )
        `)

        // 3. Tạo bảng sensor_data_raw (Bảng CON)
        await conn.query(`
            CREATE TABLE IF NOT EXISTS sensor_data_raw (
                id         BIGINT      AUTO_INCREMENT PRIMARY KEY,
                sensor_id  VARCHAR(50) NOT NULL,
                value_type VARCHAR(50) NOT NULL,
                value      FLOAT       NOT NULL,
                message_id BIGINT      NOT NULL,
                created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id) ON DELETE CASCADE,
                FOREIGN KEY (message_id) REFERENCES sensor_data(message_id) ON DELETE CASCADE,
                INDEX idx_sdr_sensor (sensor_id),
                INDEX idx_sdr_message (message_id),
                INDEX idx_sdr_value_type (value_type),
                INDEX idx_sdr_created (created_at)
            )
        `)

        // 4. Tạo bảng devices
        await conn.query(`
            CREATE TABLE IF NOT EXISTS devices (
                device_id  VARCHAR(50)  PRIMARY KEY,
                name       VARCHAR(100) NOT NULL,
                type       ENUM('light','fan','ac','alarm','unknown') NOT NULL DEFAULT 'unknown',
                pin        INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)

        // 5. Tạo bảng device_state
        await conn.query(`
            CREATE TABLE IF NOT EXISTS device_state (
                device_id  VARCHAR(50) PRIMARY KEY,
                state      VARCHAR(50) NOT NULL,
                updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
            )
        `)

        // 6. Tạo bảng action_history
        await conn.query(`
            CREATE TABLE IF NOT EXISTS action_history (
                id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(36)  UNIQUE,
                device_id  VARCHAR(50)  NOT NULL,
                action     ENUM('turn_on','turn_off')  NOT NULL,
                status     ENUM('waiting','success','fail')  NOT NULL,
                state      ENUM('on','off') NOT NULL,
                created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
                INDEX idx_ah_request   (request_id),
                INDEX idx_ah_device    (device_id),
                INDEX idx_ah_action    (action),
                INDEX idx_ah_status    (status),
                INDEX idx_ah_created   (created_at)
            )
        `)

        // Khởi tạo dữ liệu mẫu
        await conn.query(`
            INSERT IGNORE INTO sensors (sensor_id, name, type) VALUES
                ('dht11_1', 'DHT11 Temp & Humidity Sensor', 'temperature + humidity'),
                ('ldr_1', 'LDR Light Sensor', 'light'),
                ('sm_1', 'SM Soil Moisture Sensor', 'soil_moisture')
        `)

        await conn.query(`
            INSERT IGNORE INTO devices (device_id, name, type, pin) VALUES
                ('light_1', 'Room Light',  'light', 5),
                ('fan_1',   'Room Fan', 'fan',   4),
                ('ac_1',    'Air Conditioner', 'ac',   13),
                ('alarm_1', 'Warning Light', 'alarm', 12)
        `)

        await conn.query(`
            INSERT IGNORE INTO device_state (device_id, state) VALUES
                ('light_1', 'off'),
                ('fan_1',   'off'),
                ('ac_1',    'off'),
                ('alarm_1', 'off')
        `)

        conn.release()
        console.log(`DB Connected — database "${DB_NAME}" ready with Foreign Keys`)

    } catch (error) {
        console.log("DB Init Error:", error)
        process.exit(1)
    }
}

pool.on('error', (err) => {
    console.error('[MySQL Pool Error]', err)
})

export default pool