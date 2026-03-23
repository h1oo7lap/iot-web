import actionModel from '../../models/actionModel.js'

/**
 * Xử lý message từ topic esp/action
 * JSON: { "device_id": "light_1", "action": "turn_on", "status": "success", "state": "on" }
 */
const handleAction = async (payload) => {
    let parsed
    try {
        parsed = JSON.parse(payload)
    } catch {
        console.log('[MQTT/action] Invalid JSON:', payload)
        return
    }

    const { device_id, action, status, state } = parsed

    if (!device_id || !action) {
        console.log('[MQTT/action] Missing device_id or action')
        return
    }

    try {
        await actionModel.insertAction({ device_id, action, status, state })
        console.log(`[MQTT/action] device=${device_id} action=${action} status=${status}`)
    } catch (error) {
        console.log('[MQTT/action] DB error:', error.message)
    }
}

export { handleAction }
