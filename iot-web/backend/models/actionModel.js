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
        `SELECT id AS display_id, request_id, device_id, action, status, state, timestamp
         FROM action_history ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    )
    return { total, rows }
}

// Tạo bản ghi với status = "waiting" — gọi trước khi publish MQTT
const createAction = async ({ request_id, device_id, action, desired_state }) => {
    await pool.query(
        `INSERT INTO action_history (request_id, device_id, action, status, state)
         VALUES (?, ?, ?, 'waiting', ?)`,
        [request_id, device_id, action, desired_state]
    )
}

// Resolve action sau khi nhận trạng thái thực tế từ ESP (qua esp/state)
// So sánh actual_state vs desired_state → "success" hoặc "fail"
const resolveAction = async ({ request_id, actual_state, desired_state }) => {
    const status = actual_state === desired_state ? 'success' : 'fail'
    await pool.query(
        `UPDATE action_history SET status = ?, state = ? WHERE request_id = ?`,
        [status, actual_state, request_id]
    )
    return status
}

// Lấy desired_state từ action_history theo request_id (dùng trong stateHandler)
const getDesiredState = async (request_id) => {
    const [[row]] = await pool.query(
        `SELECT state FROM action_history WHERE request_id = ? LIMIT 1`,
        [request_id]
    )
    return row ? row.state : null
}

// Đánh "fail" (timeout) nếu action vẫn đang "waiting" sau N giây
// Dùng WHERE status = 'waiting' để không ghi đè nếu ESP phản hồi muộn nhưng vẫn kịp
const timeoutAction = async (request_id) => {
    const [result] = await pool.query(
        `UPDATE action_history SET status = 'fail', state = 'timeout'
         WHERE request_id = ? AND status = 'waiting'`,
        [request_id]
    )
    return result.affectedRows > 0 // true nếu đã timeout, false nếu đã được resolve rồi
}

export default { getActions, createAction, resolveAction, getDesiredState, timeoutAction }

