import pool from '../config/db.js'

// Lấy danh sách action history
const getActions = async ({ device_id, action, status, date_from, date_to, search, limit, offset }) => {
    const conditions = []
    const values = []

    if (device_id) { conditions.push('device_id = ?'); values.push(device_id) }
    if (action)    { conditions.push('action = ?');    values.push(action) }
    if (status)    { conditions.push('status = ?');    values.push(status) }
    if (date_from) { conditions.push('timestamp >= ?'); values.push(date_from) }
    if (date_to)   { conditions.push('timestamp <= ?'); values.push(date_to) }

    // Xử lý tìm kiếm toàn cục nhiều trường (ID, Device, Action, Status, Time)
    if (search) {
        conditions.push(`(
            id LIKE ? OR
            device_id LIKE ? OR
            action LIKE ? OR
            status LIKE ? OR
            state LIKE ? OR
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') LIKE ?
        )`)
        const pattern = `%${search}%`
        values.push(pattern, pattern, pattern, pattern, pattern, pattern)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM action_history ${where}`, values
    )
    const [rows] = await pool.query(
        `SELECT id AS display_id, device_id, action, status, state, timestamp
         FROM action_history ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    )
    return { total, rows }
}

// Insert 1 action (dùng trong MQTT handler)
const insertAction = async ({ device_id, action, status, state }) => {
    await pool.query(
        `INSERT INTO action_history (device_id, action, status, state) VALUES (?, ?, ?, ?)`,
        [device_id, action, status || 'unknown', state || 'unknown']
    )
}

export default { getActions, insertAction }
