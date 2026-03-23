import sensorModel from '../models/sensorModel.js';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination.js';

const getSensorData = async (req, res) => {
    try {
        // Dùng Destructuring (ES6) để bóc tách dữ liệu
        const { page, limit, offset } = getPaginationParams(req.query);

        const { total, rows } = await sensorModel.getSensorData({
            device_id: req.query.device_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit,
            offset,
        });

        // Gọi hàm format gọn gàng
        res.json(formatPaginationResponse(page, limit, total, rows));

    } catch (error) {
        console.error('[getSensorData Error]:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const getRawData = async (req, res) => {
    try {
        const { page, limit, offset } = getPaginationParams(req.query);

        const { total, rows } = await sensorModel.getRawData({
            sensor_id: req.query.sensor_id,
            value_type: req.query.value_type,
            group_id: req.query.group_id,
            device_id: req.query.device_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit,
            offset,
        });

        res.json(formatPaginationResponse(page, limit, total, rows));

    } catch (error) {
        console.error('[getRawData Error]:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const getLatest = async (req, res) => {
    try {
        // Vẫn dùng hàm tiện ích, truyền defaultLimit = 20
        const { limit } = getPaginationParams(req.query, 20);

        // Truyền limit vào model để lấy đúng số lượng
        const data = await sensorModel.getLatestData({ limit });

        res.json({ success: true, limit, data });

    } catch (error) {
        console.error('[getLatest Error]:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export { getSensorData, getRawData, getLatest };