import deviceModel from '../models/deviceModel.js'
import { publishAction, getClient } from '../mqtt/client.js'
import { randomUUID } from 'crypto'
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination.js'
import { io } from '../server.js'

// Lấy danh sách tất cả thiết bị và trạng thái hiện tại (Dashboard)
const getDevices = async (req, res) => {
    try {
        const data = await deviceModel.getAllDevices()
        res.json({ success: true, data })
    } catch (error) {
        console.error('[getDevices Error]:', error)
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}

// Gửi lệnh điều khiển thiết bị (Bật/Tắt)
const controlDevice = async (req, res) => {
    try {
        const { device_id } = req.params
        const { action } = req.body // 'turn_on' hoặc 'turn_off'

        // Kiểm tra đầu vào
        if (!action || !['turn_on', 'turn_off'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be "turn_on" or "turn_off"' })
        }

        // Kiểm tra kết nối MQTT Broker
        const client = getClient()
        if (!client || !client.connected) {
            return res.status(503).json({ success: false, message: 'MQTT Broker is not connected' })
        }

        const request_id = randomUUID()
        const desired_state = action === 'turn_on' ? 'on' : 'off'
        const TIMEOUT_MS = 10000

        // lưu lịch sử điều khiển với trạng thái waiting
        await deviceModel.createAction({
            request_id,
            device_id,
            action,
            desired_state
        })

        // gửi lệnh điều khiển
        publishAction({ request_id, device_id, action })

        // Thông báo cho Action History cập nhật ngay lập tức
        io.emit('action:new', { request_id, device_id, action })

        console.log(`[Control] Sent: request_id=${request_id} device=${device_id} action=${action}`)

        //xử lý timeout
        setTimeout(async () => {
            try {
                const { rows } = await deviceModel.getActions({ request_id, limit: 1, offset: 0 });
                if (rows.length > 0 && rows[0].status === 'waiting') {
                    await deviceModel.failActionRequest(request_id);
                    console.log(`[Control] TIMEOUT request_id=${request_id} → marked as fail`);
                }
            } catch (err) {
                console.error('[Timeout Process Error]:', err.message);
            }
        }, TIMEOUT_MS)

        // trả lịch sử điều khiển với trạng thái waiting
        res.json({
            success: true,
            message: `Command "${action}" sent — waiting for device confirmation`,
            data: { request_id, device_id, action },
        })

    } catch (error) {
        console.error('[controlDevice Error]:', error)
        res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}

// Lấy lịch sử điều khiển
const getActionHistory = async (req, res) => {
    try {
        const { page, limit, offset } = getPaginationParams(req.query, 10);
        const { total, rows } = await deviceModel.getActions({
            device_id: req.query.device_id,
            action: req.query.action,
            status: req.query.status,
            search: req.query.search,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit,
            offset
        });
        res.json(formatPaginationResponse(page, limit, total, rows));
    } catch (error) {
        console.error('[getActionHistory Error]:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

export { getDevices, controlDevice, getActionHistory }