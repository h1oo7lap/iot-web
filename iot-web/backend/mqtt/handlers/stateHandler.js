import deviceModel from '../../models/deviceModel.js'

/**
 * Xử lý message từ topic esp/state
 * JSON: { "device_id": "light_1", "state": "on" }
 */
const handleState = async (payload, io) => {
    let parsed
    try {
        parsed = JSON.parse(payload)
    } catch {
        console.log('[MQTT/state] Invalid JSON:', payload)
        return
    }

    const { device_id, state } = parsed

    if (!device_id || !state) {
        console.log('[MQTT/state] Missing device_id or state')
        return
    }

    try {
        await deviceModel.upsertState(device_id, state)
        console.log(`[MQTT/state] device=${device_id} state=${state}`)

        if (io) {
            io.emit('device:state', { device_id, state })
        }
    } catch (error) {
        console.log('[MQTT/state] DB error:', error.message)
    }
}

export { handleState }
