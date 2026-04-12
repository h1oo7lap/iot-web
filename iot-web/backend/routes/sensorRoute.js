import express from 'express'
import { getSensorData, getSensorDataRaw, getLatestSensorData } from '../controllers/sensorController.js'

const sensorRouter = express.Router()

sensorRouter.get('/', getSensorData)
sensorRouter.get('/raw', getSensorDataRaw)
sensorRouter.get('/latest', getLatestSensorData)

export default sensorRouter
