import sensorModel from '../models/sensorModel.js';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination.js';

const getSensorData = async (req, res) => {
    try {
        const { page, limit, offset } = getPaginationParams(req.query);

        // Yêu cầu mở rộng: Không phá vỡ API cũ.
        // Hỗ trợ truyền thêm query param sensor_id hoặc value_type
        if (req.query.sensor_id || req.query.value_type) {
            const { total, rows } = await sensorModel.getRawData({
                sensor_id: req.query.sensor_id,
                value_type: req.query.value_type,
                group_id: req.query.group_id,
                device_id: req.query.device_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                search: req.query.search,
                limit,
                offset,
            });
            // Định dạng trả về raw data, vẫn dùng pagination format cũ
            return res.json(formatPaginationResponse(page, limit, total, rows));
        }

        // BÌNH THƯỜNG: Trả về aggregated data (nhiệt độ, độ ẩm, ánh sáng - group lại)
        const { total, rows } = await sensorModel.getSensorData({
            device_id: req.query.device_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            group_id: req.query.group_id, // Allow filtering aggregated by group_id too
            search: req.query.search,
            limit,
            offset,
        });

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