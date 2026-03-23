import pool from '../config/db.js'

// Lấy dữ liệu gộp từ sensor_data (1 row = 1 lần đo)
const getSensorData = async ({ device_id, date_from, date_to, search, limit, offset }) => {
    const conditions = []
    const values = []

    if (device_id) { conditions.push('device_id = ?'); values.push(device_id) }
    if (date_from) { conditions.push('timestamp >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('timestamp <= ?'); values.push(date_to) }

    // Xử lý tìm kiếm toàn cục nhiều trường (ID, Time, Value)
    if (search) {
        conditions.push(`(
            id LIKE ? OR
            temperature LIKE ? OR
            humidity LIKE ? OR
            light LIKE ? OR
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') LIKE ?
        )`)
        const pattern = `%${search}%`
        values.push(pattern, pattern, pattern, pattern, pattern)
    }

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
const getRawData = async ({ sensor_id, value_type, group_id, device_id, date_from, date_to, search, limit, offset }) => {
    const conditions = []
    const values = []

    if (sensor_id) { conditions.push('r.sensor_id = ?'); values.push(sensor_id) }
    if (value_type) { conditions.push('r.value_type = ?'); values.push(value_type) }
    if (group_id) { conditions.push('r.group_id = ?'); values.push(group_id) }
    if (device_id) { conditions.push('r.device_id = ?'); values.push(device_id) }
    if (date_from) { conditions.push('r.timestamp >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('r.timestamp <= ?'); values.push(date_to) }

    // Tính năng tìm kiếm dùng LIKE trên Raw log, map ID tuần tự của bảng chung
    if (search) {
        conditions.push(`(
            sd.id LIKE ? OR
            r.sensor_id LIKE ? OR
            r.value_type LIKE ? OR
            r.value LIKE ? OR
            DATE_FORMAT(r.timestamp, '%Y-%m-%d %H:%i:%s') LIKE ?
        )`)
        const pattern = `%${search}%`
        values.push(pattern, pattern, pattern, pattern, pattern)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total 
         FROM sensor_data_raw r 
         JOIN sensor_data sd ON r.group_id = sd.group_id 
         ${where}`, values
    )
    const [rows] = await pool.query(
        `SELECT sd.id AS display_id, r.sensor_id, r.value_type, r.value, r.group_id, r.device_id, r.timestamp
         FROM sensor_data_raw r
         JOIN sensor_data sd ON r.group_id = sd.group_id
         ${where} ORDER BY sd.id DESC LIMIT ? OFFSET ?`,
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
