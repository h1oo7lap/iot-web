import deviceModel from '../../models/deviceModel.js'
import actionModel from '../../models/actionModel.js'

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
        await deviceModel.upsertState(device_id, state)
        console.log(`[MQTT/state] device=${device_id} state=${state}`)

        if (request_id) {
            const desiredState = await actionModel.getDesiredState(request_id)

            if (desiredState !== null) {
                const status = await actionModel.resolveAction({
                    request_id,
                    actual_state: state,
                    desired_state: desiredState,
                })
                console.log(`[MQTT/state] request_id=${request_id} resolved → ${status}`)
            } else {
                console.log(`[MQTT/state] request_id=${request_id} not found in action_history`)
            }
        }

        if (io) {
            io.emit('device:state', { device_id, state })
        }
    } catch (error) {
        console.log('[MQTT/state] DB error:', error.message)
    }
}

export { handleState }
