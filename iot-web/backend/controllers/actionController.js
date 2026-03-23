import actionModel from '../models/actionModel.js'

const getActions = async (req, res) => {
    try {
        const page   = Math.max(1, parseInt(req.query.page  || '1'))
        const limit  = Math.max(1, Math.min(100, parseInt(req.query.limit || '20')))
        const offset = (page - 1) * limit

        const { total, rows } = await actionModel.getActions({
            device_id: req.query.device_id,
            action:    req.query.action,
            status:    req.query.status,
            date_from: req.query.date_from,
            date_to:   req.query.date_to,
            search:    req.query.search,
            limit,
            offset,
        })

        res.json({
            success: true,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
            data: rows,
        })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: 'Error' })
    }
}

export { getActions }
