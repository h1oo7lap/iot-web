import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { spawn } from 'child_process'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { connectDB } from './config/db.js'
import { connectMQTT } from './mqtt/client.js'
import sensorRouter from './routes/sensorRoute.js'
import deviceRouter from './routes/deviceRoute.js'

// Khởi động Mosquitto broker 
const startMosquitto = () => {
    const configPath = process.env.MOSQUITTO_CONF || 'C:\\Users\\h1oo7\\Desktop\\iot_v2\\iot-web\\arduino-mqtt\\myconfig.conf'
    const mosquitto = spawn('mosquitto', ['-c', configPath, '-v'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
    })

    mosquitto.stdout.on('data', (data) => console.log('[Mosquitto]', data.toString().trim()))
    mosquitto.stderr.on('data', (data) => console.log('[Mosquitto]', data.toString().trim()))

    mosquitto.on('error', (err) => {
        console.log('[Mosquitto] Failed to start. Make sure it is in PATH.')
    })

    console.log('[Mosquitto] Broker is starting...')
    return mosquitto
}

// App config
const app = express()
const server = createServer(app)
const port = process.env.PORT || 4000

// Socket.IO config
export const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
    console.log('[Socket.IO] New client connected:', socket.id)
    socket.on('disconnect', () => console.log('[Socket.IO] Client disconnected'))
})

// Middleware
app.use(express.json())
app.use(cors())

// Kết nối Database
connectDB()

// Khởi động Mosquitto và Kết nối MQTT 
startMosquitto()
setTimeout(() => connectMQTT(io), 1500)

// API Endpoints 
app.use('/api/sensors', sensorRouter) // Quản lý lịch sử, data raw, data latest
app.use('/api/devices', deviceRouter) // Quản lý danh sách thiết bị, điều khiển và lịch sử action

app.get('/', (req, res) => res.send('IoT Backend Ver 2 - Ready'))

// Start Server
server.listen(port, () => {
    console.log(`[Server] Running at http://localhost:${port}`)
})