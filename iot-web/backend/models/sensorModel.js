import pool from '../config/db.js'

// Lấy dữ liệu gộp từ sensor_data (1 row = 1 lần đo)
const getSensorData = async ({ device_id, date_from, date_to, limit, offset }) => {
    const conditions = []
    const values = []

    if (device_id) { conditions.push('device_id = ?'); values.push(device_id) }
    if (date_from) { conditions.push('timestamp >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('timestamp <= ?'); values.push(date_to) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM sensor_data ${where}`, values
    )
    const [rows] = await pool.query(
        `SELECT id AS display_id, group_id, device_id, temperature, humidity, light, timestamp
         FROM sensor_data ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    )
    return { total, rows }
}

// Lấy raw log từng giá trị sensor
const getRawData = async ({ sensor_id, value_type, group_id, device_id, date_from, date_to, limit, offset }) => {
    const conditions = []
    const values = []

    if (sensor_id) { conditions.push('sensor_id = ?'); values.push(sensor_id) }
    if (value_type) { conditions.push('value_type = ?'); values.push(value_type) }
    if (group_id) { conditions.push('group_id = ?'); values.push(group_id) }
    if (device_id) { conditions.push('device_id = ?'); values.push(device_id) }
    if (date_from) { conditions.push('timestamp >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('timestamp <= ?'); values.push(date_to) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM sensor_data_raw ${where}`, values
    )
    const [rows] = await pool.query(
        `SELECT id AS display_id, sensor_id, value_type, value, group_id, device_id, timestamp
         FROM sensor_data_raw ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    )
    return { total, rows }
}

// Lấy danh sách các bản ghi mới nhất (mặc định 20 dòng)
const getLatestData = async ({ limit = 20 } = {}) => {
    // Ép kiểu limit sang số (Number) để thư viện mysql/mysql2 không bị lỗi syntax
    const numericLimit = Number(limit);

    const [rows] = await pool.query(
        `SELECT id AS display_id, group_id, device_id, temperature, humidity, light, timestamp
         FROM sensor_data ORDER BY id DESC LIMIT ?`,
        [numericLimit]
    )

    // Trả về toàn bộ mảng thay vì chỉ lấy rows[0]
    return rows;
}

// Bulk insert raw + upsert gộp (dùng trong MQTT handler)
const insertSensorData = async ({ group_id, device_id, temperature, humidity, light, rawRows }) => {
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()

        await conn.query(
            `INSERT INTO sensor_data_raw (sensor_id, value_type, value, group_id, device_id) VALUES ?`,
            [rawRows]
        )

        await conn.query(
            `INSERT INTO sensor_data (group_id, device_id, temperature, humidity, light)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               temperature = COALESCE(VALUES(temperature), temperature),
               humidity    = COALESCE(VALUES(humidity),    humidity),
               light       = COALESCE(VALUES(light),       light),
               device_id   = VALUES(device_id)`,
            [group_id, device_id, temperature, humidity, light]
        )

        await conn.commit()
    } catch (error) {
        await conn.rollback()
        throw error
    } finally {
        conn.release()
    }
}

export default { getSensorData, getRawData, getLatestData, insertSensorData }
