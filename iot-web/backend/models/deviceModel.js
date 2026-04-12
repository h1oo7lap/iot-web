import pool from '../config/db.js';

// truy vấn thiết bị và trạng thái
const getAllDevices = async () => {
    const [rows] = await pool.query(
        `SELECT d.device_id, d.name, d.type, d.pin,
                COALESCE(ds.state, 'off') AS state,
                ds.updated_at AS state_updated_at
         FROM devices d
         LEFT JOIN device_state ds ON d.device_id = ds.device_id
         ORDER BY d.device_id`
    );
    return rows;
};

// cập nhật trạng thái 
const updateDeviceState = async (device_id, state) => {
    return await pool.query(
        `INSERT INTO device_state (device_id, state) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = CURRENT_TIMESTAMP`,
        [device_id, state]
    );
};

// khởi tạo request
const createAction = async ({ request_id, device_id, action, desired_state }) => {
    return await pool.query(
        `INSERT INTO action_history (request_id, device_id, action, status, state)
         VALUES (?, ?, ?, 'waiting', ?)`,
        [request_id, device_id, action, desired_state]
    );
};

// xử lý request
const resolveActionRequest = async (request_id, actual_state) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Lấy trạng thái mong muốn để đối chiếu
        const [rows] = await connection.query(
            'SELECT state as desired_state FROM action_history WHERE request_id = ?',
            [request_id]
        );

        if (rows.length > 0) {
            const { desired_state } = rows[0];
            const finalStatus = (actual_state === desired_state) ? 'success' : 'fail';

            // Cập nhật trạng thái cuối cùng của request
            await connection.query(
                'UPDATE action_history SET status = ? WHERE request_id = ?',
                [finalStatus, request_id]
            );

            await connection.commit();
            return finalStatus;
        }

        await connection.commit();
        return null;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// truy vấn request
const getActions = async ({ device_id, request_id, action, status, date_from, date_to, search, limit, offset }) => {
    const conditions = [];
    const values = [];

    if (device_id) { conditions.push('ah.device_id = ?'); values.push(device_id); }
    if (request_id) { conditions.push('ah.request_id = ?'); values.push(request_id); }
    if (action) { conditions.push('ah.action = ?'); values.push(action); }
    if (status) { conditions.push('ah.status = ?'); values.push(status); }
    if (date_from) { conditions.push('ah.created_at >= ?'); values.push(date_from); }
    if (date_to) { conditions.push('ah.created_at <= ?'); values.push(date_to); }

    if (search) {
        conditions.push(`(
            ah.id LIKE ? OR 
            ah.request_id LIKE ? OR 
            ah.device_id LIKE ? OR 
            d.name LIKE ? OR 
            ah.action LIKE ? OR 
            ah.status LIKE ? OR 
            DATE_FORMAT(ah.created_at, '%Y-%m-%d %H:%i:%s') LIKE ?
        )`);
        const pattern = `%${search}%`;
        values.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total 
         FROM action_history ah 
         LEFT JOIN devices d ON ah.device_id = d.device_id 
         ${where}`, 
        values
    );

    const [rows] = await pool.query(
        `SELECT ah.id, ah.request_id, ah.device_id, ah.action, ah.status, ah.state, ah.created_at, d.name
         FROM action_history ah
         LEFT JOIN devices d ON ah.device_id = d.device_id
         ${where} ORDER BY ah.id DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );
    return { total, rows };
};

// đánh dấu thất bại khi timeout
const failActionRequest = async (request_id) => {
    return await pool.query(
        'UPDATE action_history SET status = "fail" WHERE request_id = ? AND status = "waiting"',
        [request_id]
    );
};

export default {
    getAllDevices,
    updateDeviceState,
    createAction,
    resolveActionRequest,
    failActionRequest,
    getActions
};