import sensorModel from '../../models/sensorModel.js'

/**
 * Xử lý message từ topic esp/data
 * JSON từ Arduino:
 * {
 *   "device_id": "esp1",
 *   "group_id": 1742650000,
 *   "sensors": [
 *     { "sensor_id": "dht11_1", "temperature": 28.5, "humidity": 65.2 },
 *     { "sensor_id": "ldr_1",   "light": 512 }
 *   ]
 * }
 */
const handleData = async (payload, io) => {
    let parsed
    try {
        parsed = JSON.parse(payload)
    } catch {
        console.log('[MQTT/data] Invalid JSON:', payload)
        return
    }

    const { device_id, group_id, sensors } = parsed

    if (!group_id || !Array.isArray(sensors)) {
        console.log('[MQTT/data] Missing required fields')
        return
    }

    let temperature = null
    let humidity    = null
    let light       = null
    const rawRows   = []

    for (const sensor of sensors) {
        const { sensor_id } = sensor
        if (!sensor_id) continue

        if (sensor.temperature !== undefined) {
            rawRows.push([sensor_id, 'temperature', parseFloat(sensor.temperature), group_id, device_id])
            temperature = parseFloat(sensor.temperature)
        }
        if (sensor.humidity !== undefined) {
            rawRows.push([sensor_id, 'humidity', parseFloat(sensor.humidity), group_id, device_id])
            humidity = parseFloat(sensor.humidity)
        }
        if (sensor.light !== undefined) {
            rawRows.push([sensor_id, 'light', parseInt(sensor.light, 10), group_id, device_id])
            light = parseInt(sensor.light, 10)
        }
        // Hỗ trợ format value_type/value (mở rộng sau)
        if (sensor.value_type !== undefined && sensor.value !== undefined) {
            rawRows.push([sensor_id, sensor.value_type, parseFloat(sensor.value), group_id, device_id])
        }
    }

    if (rawRows.length === 0) {
        console.log('[MQTT/data] No valid sensor values')
        return
    }

    try {
        await sensorModel.insertSensorData({ group_id, device_id, temperature, humidity, light, rawRows })
        console.log(`[MQTT/data] group_id=${group_id} | ${rawRows.length} rows saved`)

        // Emit realtime tới tất cả clients
        if (io) {
            io.emit('sensor:data', { group_id, device_id, temperature, humidity, light, timestamp: new Date().toISOString() })
        }
    } catch (error) {
        console.log('[MQTT/data] DB error:', error.message)
    }
}

export { handleData }
