import sensorModel from '../models/sensorModel.js';
import { getPaginationParams, formatPaginationResponse } from '../utils/pagination.js';

const getSensorData = async (req, res) => {
    try {
        const { page, limit, offset } = getPaginationParams(req.query);

        // Nếu có sensor_id hoặc value_type, ta chuyển sang lấy dữ liệu RAW
        if (req.query.sensor_id || req.query.value_type) {
            const { total, rows } = await sensorModel.getSensorDataRaw({
                sensor_id: req.query.sensor_id,
                value_type: req.query.value_type,
                message_id: req.query.message_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                search: req.query.search,
                limit,
                offset,
            });
            return res.json(formatPaginationResponse(page, limit, total, rows));
        }

        // Lấy dữ liệu tổng hợp (Flat)
        const { total, rows } = await sensorModel.getSensorData({
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            message_id: req.query.message_id,
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

const getSensorDataRaw = async (req, res) => {
    try {
        const { page, limit, offset } = getPaginationParams(req.query);

        const { total, rows } = await sensorModel.getSensorDataRaw({
            sensor_id: req.query.sensor_id,
            value_type: req.query.value_type,
            message_id: req.query.message_id,
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

const getLatestSensorData = async (req, res) => {
    try {
        const { limit } = getPaginationParams(req.query, 10);

        const data = await sensorModel.getLatestSensorData({ limit });

        res.json({ success: true, limit, data });

    } catch (error) {
        console.error('[getLatest Error]:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export { getSensorData, getSensorDataRaw, getLatestSensorData };