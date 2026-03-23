import express from 'express'
import { getDevices, getDeviceState, controlDevice, getSensors } from '../controllers/deviceController.js'

const deviceRouter = express.Router()

deviceRouter.get('/',                   getDevices)
deviceRouter.get('/sensors/list',       getSensors)
deviceRouter.get('/:device_id/state',   getDeviceState)
deviceRouter.post('/:device_id/control', controlDevice)

export default deviceRouter
