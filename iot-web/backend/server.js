import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { spawn } from 'child_process'
import { createServer } from 'http'
import { Server } from 'socket.io'

import { connectDB }   from './config/db.js'
import { connectMQTT } from './mqtt/client.js'

import sensorRouter from './routes/sensorRoute.js'
import actionRouter from './routes/actionRoute.js'
import deviceRouter from './routes/deviceRoute.js'

// ===== Khởi động Mosquitto broker =====
const startMosquitto = () => {
    const configPath = process.env.MOSQUITTO_CONF
        || 'C:\\Users\\h1oo7\\Desktop\\iot-web\\arduino-mqtt\\myconfig.conf'

    const mosquitto = spawn('mosquitto', ['-c', configPath, '-v'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
    })

    mosquitto.stdout.on('data', (data) => {
        console.log('[Mosquitto]', data.toString().trim())
    })
    mosquitto.stderr.on('data', (data) => {
        console.log('[Mosquitto]', data.toString().trim())
    })
    mosquitto.on('error', (err) => {
        console.log('[Mosquitto] Failed to start:', err.message)
        console.log('[Mosquitto] Make sure mosquitto is installed and added to PATH')
    })
    mosquitto.on('close', (code) => {
        console.log(`[Mosquitto] Exited with code ${code}`)
    })

    console.log('[Mosquitto] Starting broker...')
    return mosquitto
}

// app config
const app    = express()
const server = createServer(app)
const port   = process.env.PORT || 3000

// Socket.IO
export const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
    console.log('[Socket.IO] Client connected:', socket.id)
    socket.on('disconnect', () => {
        console.log('[Socket.IO] Client disconnected:', socket.id)
    })
})

// middleware
app.use(express.json())
app.use(cors())

// db connection
connectDB()

// start mosquitto → wait 1.5s → connect mqtt (pass io for realtime emit)
startMosquitto()
setTimeout(() => connectMQTT(io), 1500)

// api endpoints
app.use('/api/sensor-data', sensorRouter)
app.use('/api/actions',     actionRouter)
app.use('/api/devices',     deviceRouter)

app.get('/', (req, res) => res.send('IoT Backend Working'))

server.listen(port, () => {
    console.log(`Server starting on http://localhost:${port}`)
})


