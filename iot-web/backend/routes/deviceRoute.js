import express from 'express'
import { getDevices, controlDevice, getActionHistory } from '../controllers/deviceController.js'

const deviceRouter = express.Router()

deviceRouter.get('/', getDevices)
deviceRouter.post('/:device_id/control', controlDevice)
deviceRouter.get('/actions', getActionHistory)

export default deviceRouter