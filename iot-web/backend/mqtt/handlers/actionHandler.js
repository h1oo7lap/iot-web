/**
 * actionHandler.js — KHÔNG CÒN SỬ DỤNG
 *
 * ESP8266 đã được sửa để không publish lên topic esp/action nữa.
 * Toàn bộ logic action (waiting → success/fail) được xử lý trong stateHandler.js
 * thông qua esp/state kèm request_id.
 *
 * File này giữ lại để tham khảo, handler rỗng để tránh lỗi nếu vẫn còn subscribe.
 */
const handleAction = async (payload) => {
    console.log('[MQTT/action] Received (ignored — topic deprecated):', payload)
}

export { handleAction }
