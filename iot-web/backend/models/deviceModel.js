import pool from '../config/db.js'

const getAllDevices = async () => {
    const [rows] = await pool.query(
        `SELECT d.device_id, d.name, d.type, d.pin,
                COALESCE(ds.state, 'off') AS state,
                ds.updated_at AS state_updated_at
         FROM devices d
         LEFT JOIN device_state ds ON d.device_id = ds.device_id
         ORDER BY d.device_id`
    )
    return rows
}

const getDeviceById = async (device_id) => {
    const [[row]] = await pool.query(
        `SELECT d.device_id, d.name, d.type,
                COALESCE(ds.state, 'off') AS state,
                ds.updated_at AS state_updated_at
         FROM devices d
         LEFT JOIN device_state ds ON d.device_id = ds.device_id
         WHERE d.device_id = ?`,
        [device_id]
    )
    return row || null
}

const deviceExists = async (device_id) => {
    const [[row]] = await pool.query(
        `SELECT device_id FROM devices WHERE device_id = ?`, [device_id]
    )
    return !!row
}

const upsertState = async (device_id, state) => {
    await pool.query(
        `INSERT INTO device_state (device_id, state) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE state = VALUES(state)`,
        [device_id, state]
    )
}

const getAllSensors = async () => {
    const [rows] = await pool.query(
        `SELECT sensor_id, device_id, name, type FROM sensors ORDER BY sensor_id`
    )
    return rows
}

export default { getAllDevices, getDeviceById, deviceExists, upsertState, getAllSensors }
