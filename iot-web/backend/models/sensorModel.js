import pool from '../config/db.js'

const getSensorData = async ({ date_from, date_to, search, limit, offset }) => {
    const conditions = []
    const values = []

    if (date_from) { conditions.push('created_at >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('created_at <= ?'); values.push(date_to) }

    if (search) {
        const lowerSearch = search.toLowerCase().trim()

        if (lowerSearch.includes('°c') || lowerSearch.endsWith('c')) {
            const num = lowerSearch.replace(/[^\d.]/g, '')
            conditions.push('temperature LIKE ?')
            values.push(`%${num}%`)
        }
        else if (lowerSearch.includes('%')) {
            const num = lowerSearch.replace(/[^\d.]/g, '')
            conditions.push('(humidity LIKE ? OR soil_moisture LIKE ?)')
            values.push(`%${num}%`, `%${num}%`)
        }
        else if (lowerSearch.includes('lx')) {
            const num = lowerSearch.replace(/[^\d.]/g, '')
            conditions.push('light LIKE ?')
            values.push(`%${num}%`)
        }
        else {
            conditions.push(`(
                id LIKE ? OR
                message_id LIKE ? OR
                temperature LIKE ? OR
                humidity LIKE ? OR
                light LIKE ? OR
                soil_moisture LIKE ? OR
                DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') LIKE ?
            )`)
            const pattern = `%${search}%`
            values.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern)
        }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM sensor_data ${where}`, values
    )
    const [rows] = await pool.query(
        `SELECT id, message_id, temperature, humidity, light, soil_moisture, created_at
         FROM sensor_data ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    )
    return { total, rows }
}

const getSensorDataRaw = async ({ sensor_id, value_type, message_id, date_from, date_to, search, limit, offset }) => {
    const conditions = []
    const values = []

    if (sensor_id) { conditions.push('r.sensor_id = ?'); values.push(sensor_id) }
    if (value_type) { conditions.push('r.value_type = ?'); values.push(value_type) }
    if (message_id) { conditions.push('r.message_id = ?'); values.push(message_id) }
    if (date_from) { conditions.push('r.created_at >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('r.created_at <= ?'); values.push(date_to) }

    if (search) {
        const lowerSearch = search.toLowerCase().trim()

        if (lowerSearch.includes('°c') || lowerSearch.endsWith('c')) {
            const num = lowerSearch.replace(/[^\d.]/g, '')
            conditions.push("(r.value_type = 'temperature' AND r.value LIKE ?)")
            values.push(`%${num}%`)
        }
        else if (lowerSearch.includes('%')) {
            const num = lowerSearch.replace(/[^\d.]/g, '')
            conditions.push("( (r.value_type = 'humidity' OR r.value_type = 'soil_moisture') AND r.value LIKE ? )")
            values.push(`%${num}%`)
        }
        else if (lowerSearch.includes('lx')) {
            const num = lowerSearch.replace(/[^\d.]/g, '')
            conditions.push("(r.value_type = 'light' AND r.value LIKE ?)")
            values.push(`%${num}%`)
        }
        else {
            conditions.push(`(
                r.id LIKE ? OR
                r.message_id LIKE ? OR
                r.sensor_id LIKE ? OR
                r.value_type LIKE ? OR
                r.value LIKE ? OR
                DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') LIKE ?
            )`)
            const pattern = `%${search}%`
            values.push(pattern, pattern, pattern, pattern, pattern, pattern)
        }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM sensor_data_raw r ${where}`, values
    )
    const [rows] = await pool.query(
        `SELECT r.id, r.sensor_id, r.value_type, r.value, r.message_id, r.created_at
         FROM sensor_data_raw r
         ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    )
    return { total, rows }
}

const getLatestSensorData = async ({ limit = 10 } = {}) => {
    const numericLimit = Number(limit);
    const [rows] = await pool.query(
        `SELECT id, message_id, temperature, humidity, light, soil_moisture, created_at
         FROM sensor_data ORDER BY id DESC LIMIT ?`,
        [numericLimit]
    )
    return rows;
}

// hàm này sẽ được gọi từ MQTT Handlers
const insertSensorData = async ({ message_id, temperature, humidity, light, soil_moisture, rawRows }) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Lưu vào bảng sensor_data
        await conn.query(
            `INSERT INTO sensor_data (message_id, temperature, humidity, light, soil_moisture) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                temperature = VALUES(temperature),
                humidity = VALUES(humidity),
                light = VALUES(light),
                soil_moisture = VALUES(soil_moisture)`,
            [message_id, temperature, humidity, light, soil_moisture]
        );

        // Lưu vào bảng sensor_data_raw
        if (rawRows && rawRows.length > 0) {
            await conn.query(
                `INSERT INTO sensor_data_raw (sensor_id, value_type, value, message_id) VALUES ?`,
                [rawRows]
            );
        }

        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

export default { getSensorData, getSensorDataRaw, getLatestSensorData, insertSensorData }