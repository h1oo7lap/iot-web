import pool from '../config/db.js'

const getActions = async ({ device_id, action, status, date_from, date_to, search, limit, offset }) => {
    const conditions = []
    const values = []

    if (device_id) { conditions.push('device_id = ?'); values.push(device_id) }
    if (action) { conditions.push('action = ?'); values.push(action) }
    if (status) { conditions.push('status = ?'); values.push(status) }
    if (date_from) { conditions.push('timestamp >= ?'); values.push(date_from) }
    if (date_to) { conditions.push('timestamp <= ?'); values.push(date_to) }

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

const createAction = async ({ request_id, device_id, action, desired_state }) => {
    await pool.query(
        `INSERT INTO action_history (request_id, device_id, action, status, state)
         VALUES (?, ?, ?, 'waiting', ?)`,
        [request_id, device_id, action, desired_state]
    )
}

const resolveAction = async ({ request_id, actual_state, desired_state }) => {
    const status = actual_state === desired_state ? 'success' : 'fail'
    await pool.query(
        `UPDATE action_history SET status = ?, state = ? WHERE request_id = ?`,
        [status, actual_state, request_id]
    )
    return status
}

const getDesiredState = async (request_id) => {
    const [[row]] = await pool.query(
        `SELECT state FROM action_history WHERE request_id = ? LIMIT 1`,
        [request_id]
    )
    return row ? row.state : null
}

const timeoutAction = async (request_id) => {
    const [result] = await pool.query(
        `UPDATE action_history SET status = 'fail', state = 'timeout'
         WHERE request_id = ? AND status = 'waiting'`,
        [request_id]
    )
    return result.affectedRows > 0
}

export default { getActions, createAction, resolveAction, getDesiredState, timeoutAction }

