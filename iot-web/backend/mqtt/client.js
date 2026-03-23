import mqtt from 'mqtt'
import 'dotenv/config'

import { handleData }   from './handlers/dataHandler.js'
import { handleAction } from './handlers/actionHandler.js'
import { handleState }  from './handlers/stateHandler.js'

export const TOPICS = {
    DATA:    'esp/data',
    CONTROL: 'esp/control',
    ACTION:  'esp/action',
    STATE:   'esp/state',
}

let mqttClient = null

export const connectMQTT = (io) => {
    const brokerUrl = `mqtt://${process.env.MQTT_HOST || '192.168.0.100'}:${process.env.MQTT_PORT || 1007}`

    mqttClient = mqtt.connect(brokerUrl, {
        username:        process.env.MQTT_USER || 'h1oo7',
        password:        process.env.MQTT_PASS || '1007',
        clientId:        `backend_${Date.now()}`,
        reconnectPeriod: 5000,
        connectTimeout:  10000,
        clean:           true,
        keepalive:       60,
    })

    mqttClient.on('connect', () => {
        console.log('MQTT Connected')
        mqttClient.subscribe([TOPICS.DATA, TOPICS.ACTION, TOPICS.STATE], { qos: 1 }, (err) => {
            if (err) return console.log('[MQTT] Subscribe error:', err.message)
            console.log(`MQTT Subscribed: ${TOPICS.DATA}, ${TOPICS.ACTION}, ${TOPICS.STATE}`)
        })
    })

    mqttClient.on('message', async (topic, payload) => {
        const message = payload.toString()
        console.log(`[MQTT] [${topic}]`, message)

        if (topic === TOPICS.DATA)   await handleData(message, io)
        if (topic === TOPICS.ACTION) await handleAction(message, io)
        if (topic === TOPICS.STATE)  await handleState(message, io)
    })

    mqttClient.on('reconnect', () => console.log('MQTT Reconnecting...'))
    mqttClient.on('offline',   () => console.log('MQTT Offline'))
    mqttClient.on('error',     (err) => console.log('MQTT Error:', err.message))
}

export const publish = (topic, message) => {
    if (!mqttClient || !mqttClient.connected) throw new Error('MQTT not connected')
    const payload = typeof message === 'string' ? message : JSON.stringify(message)
    mqttClient.publish(topic, payload, { qos: 1 })
    console.log(`[MQTT] Pub [${topic}]`, payload)
}

export const getClient = () => mqttClient

