import express from 'express'
import { getSensorData, getRawData, getLatest } from '../controllers/sensorController.js'

const sensorRouter = express.Router()

sensorRouter.get('/', getSensorData)
sensorRouter.get('/raw', getRawData)
sensorRouter.get('/latest', getLatest)

export default sensorRouter
