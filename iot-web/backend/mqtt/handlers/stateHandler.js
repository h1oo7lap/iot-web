import deviceModel from '../../models/deviceModel.js'
import actionModel  from '../../models/actionModel.js'

/**
 * Xử lý message từ topic esp/state
 * JSON mới từ ESP:
 * { "request_id": "...", "device_id": "light_1", "state": "on" }
 *
 * Flow:
 * 1. Upsert device_state để cập nhật trạng thái hiện tại
 * 2. Nếu có request_id → lấy desired_state từ action_history, so sánh → resolve "success"/"fail"
 * 3. Emit Socket.IO cho frontend
 */
const handleState = async (payload, io) => {
    let parsed
    try {
        parsed = JSON.parse(payload)
    } catch {
        console.log('[MQTT/state] Invalid JSON:', payload)
        return
    }

    const { request_id, device_id, state } = parsed

    if (!device_id || !state) {
        console.log('[MQTT/state] Missing device_id or state')
        return
    }

    try {
        // 1. Cập nhật trạng thái hiện tại của thiết bị
        await deviceModel.upsertState(device_id, state)
        console.log(`[MQTT/state] device=${device_id} state=${state}`)

        // 2. Resolve action nếu có request_id
        if (request_id) {
            // Lấy desired_state từ action_history theo request_id
            const desiredState = await actionModel.getDesiredState(request_id)

            if (desiredState !== null) {
                const status = await actionModel.resolveAction({
                    request_id,
                    actual_state:  state,
                    desired_state: desiredState,
                })
                console.log(`[MQTT/state] request_id=${request_id} resolved → ${status}`)
            } else {
                console.log(`[MQTT/state] request_id=${request_id} not found in action_history`)
            }
        }

        // 3. Emit realtime tới frontend
        if (io) {
            io.emit('device:state', { device_id, state })
        }
    } catch (error) {
        console.log('[MQTT/state] DB error:', error.message)
    }
}

export { handleState }
