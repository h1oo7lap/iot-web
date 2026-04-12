import deviceModel from '../../models/deviceModel.js';

const handleState = async (payload, io) => {
    let parsed;
    try {
        parsed = JSON.parse(payload);
    } catch {
        console.log('[MQTT/state] Invalid JSON');
        return;
    }

    const { request_id, device_id, state } = parsed;
    if (!device_id || !state) return;

    try {
        // Luôn cập nhật trạng thái thực tế vào bảng device_state
        await deviceModel.updateDeviceState(device_id, state);

        // Nếu tin nhắn phản hồi có request_id, đối chiếu để chốt Success/Fail
        if (request_id) {
            const finalStatus = await deviceModel.resolveActionRequest(request_id, state);
            if (finalStatus) {
                console.log(`[MQTT/state] Request ${request_id} -> ${finalStatus}`);
            }
        }

        // Thông báo cho Frontend qua Socket.io
        if (io) {
            io.emit('device:state', { device_id, state, request_id });
        }

    } catch (error) {
        console.error('[MQTT/state] Process Error:', error.message);
    }
};

export { handleState };