import mqtt from 'mqtt'
import 'dotenv/config'

import { handleData } from './handlers/dataHandler.js'
import { handleState } from './handlers/stateHandler.js'

export const TOPICS = {
    DATA: 'esp/data',
    CONTROL: 'esp/control',
    STATE: 'esp/state',
}

let mqttClient = null

export const connectMQTT = (io) => {

    const brokerUrl = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`

    mqttClient = mqtt.connect(brokerUrl, {
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASS,
        clientId: `backend_server_${Math.random().toString(16).slice(2, 8)}`,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        clean: true,
        keepalive: 60,
    })

    mqttClient.on('connect', () => {
        console.log(`[MQTT] Connected to Broker: ${brokerUrl}`)

        // Subscribe các topic mà Arduino sẽ gửi dữ liệu về
        mqttClient.subscribe([TOPICS.DATA, TOPICS.STATE], { qos: 1 }, (err) => {
            if (err) return console.log('[MQTT] Subscribe error:', err.message)
            console.log(`[MQTT] Subscribed to: ${TOPICS.DATA}, ${TOPICS.STATE}`)
        })
    })

    mqttClient.on('message', async (topic, payload) => {
        const message = payload.toString()

        console.log(`[MQTT] Incoming [${topic}]`)

        try {
            if (topic === TOPICS.DATA) {
                await handleData(message, io)
            } else if (topic === TOPICS.STATE) {
                await handleState(message, io)
            }
        } catch (err) {
            console.error(`[MQTT] Error handling ${topic}:`, err.message)
        }
    })

    mqttClient.on('reconnect', () => console.log('[MQTT] Reconnecting...'))
    mqttClient.on('error', (err) => console.log('[MQTT] Error:', err.message))
}

// Hàm này sẽ được gọi từ DeviceController khi bấm nút trên Web
export const publishAction = (message) => {
    if (!mqttClient || !mqttClient.connected) {
        console.error('[MQTT] Cannot publish: Not connected')
        return
    }

    // Đảm bảo message là JSON string chuẩn (có dấu ngoặc kép) để Arduino không bị [WARN]
    const payload = JSON.stringify(message)

    mqttClient.publish(TOPICS.CONTROL, payload, { qos: 1 }, (err) => {
        if (err) console.error('[MQTT] Publish error:', err.message)
    })

    console.log(`[MQTT] Pub [${TOPICS.CONTROL}]`, payload)
}

export const getClient = () => mqttClient