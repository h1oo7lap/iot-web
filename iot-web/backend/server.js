import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { spawn } from 'child_process'

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
const app  = express()
const port = process.env.PORT || 3000

// middleware
app.use(express.json())
app.use(cors())

// db connection
connectDB()

// start mosquitto → wait 1.5s → connect mqtt
startMosquitto()
setTimeout(() => connectMQTT(), 1500)

// api endpoints
app.use('/api/sensor-data', sensorRouter)
app.use('/api/actions',     actionRouter)
app.use('/api/devices',     deviceRouter)

app.get('/', (req, res) => res.send('IoT Backend Working'))

app.listen(port, () => {
    console.log(`Server starting on http://localhost:${port}`)
})

