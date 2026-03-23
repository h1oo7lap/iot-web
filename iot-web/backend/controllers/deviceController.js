import deviceModel from '../models/deviceModel.js'
import { publish, getClient, TOPICS } from '../mqtt/client.js'

const getDevices = async (req, res) => {
    try {
        const data = await deviceModel.getAllDevices()
        res.json({ success: true, data })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: 'Error' })
    }
}

const getDeviceState = async (req, res) => {
    try {
        const data = await deviceModel.getDeviceById(req.params.device_id)
        if (!data) return res.json({ success: false, message: 'Device not found' })
        res.json({ success: true, data })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: 'Error' })
    }
}

const controlDevice = async (req, res) => {
    try {
        const { device_id } = req.params
        const { action }    = req.body

        if (!action || !['turn_on', 'turn_off'].includes(action)) {
            return res.json({ success: false, message: 'action must be "turn_on" or "turn_off"' })
        }

        const exists = await deviceModel.deviceExists(device_id)
        if (!exists) return res.json({ success: false, message: 'Device not found' })

        const client = getClient()
        if (!client || !client.connected) {
            return res.json({ success: false, message: 'MQTT broker is not connected' })
        }

        publish(TOPICS.CONTROL, { device_id, action })

        res.json({
            success: true,
            message: `Command "${action}" sent to "${device_id}"`,
            data: { device_id, action },
        })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: 'Error' })
    }
}

const getSensors = async (req, res) => {
    try {
        const data = await deviceModel.getAllSensors()
        res.json({ success: true, data })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: 'Error' })
    }
}

export { getDevices, getDeviceState, controlDevice, getSensors }
