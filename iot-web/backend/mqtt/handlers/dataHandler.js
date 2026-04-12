import sensorModel from '../../models/sensorModel.js';
import deviceModel from '../../models/deviceModel.js';

const handleData = async (payload, io) => {
    let parsed;
    try {
        parsed = JSON.parse(payload);
    } catch {
        console.log('[MQTT/data] Invalid JSON:', payload);
        return;
    }

    const { message_id, sensors } = parsed;

    if (!message_id || !Array.isArray(sensors)) {
        console.log('[MQTT/data] Missing message_id or sensors array');
        return;
    }

    let temperature = null;
    let humidity = null;
    let light = null;
    let soil_moisture = null;
    const rawRows = [];

    for (const s of sensors) {
        const { sensor_id, value_type, value } = s;
        if (!sensor_id || value === undefined) continue;

        // Gom vào mảng để Model thực hiện Bulk Insert cho bảng RAW
        rawRows.push([sensor_id, value_type, value, message_id]);

        // Phân loại để lưu vào bảng phẳng
        switch (value_type) {
            case 'temperature': temperature = value; break;
            case 'humidity': humidity = value; break;
            case 'light': light = value; break;
            case 'soil_moisture': soil_moisture = value; break;
        }
    }

    // Lưu với Model
    try {
        await sensorModel.insertSensorData({
            message_id,
            temperature,
            humidity,
            light,
            soil_moisture,
            rawRows
        });

        console.log(`[MQTT/data] Saved message_id: ${message_id}`);

        // Emit realtime data to Socket.IO
        if (io) {
            io.emit('sensor:data', {
                message_id,
                temperature,
                humidity,
                light,
                soil_moisture,
                created_at: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('[MQTT/data] Save Error:', error.message);
    }

    // 4. Automation Logic: Soil Moisture > 70% -> Alarm ON
    try {
        if (soil_moisture !== null) {
            const devices = await deviceModel.getAllDevices();
            const alarm = devices.find(d => d.device_id === 'alarm_1');
            
            if (alarm) {
                const threshold = 70;
                const isOverThreshold = soil_moisture > threshold;
                const desiredAction = isOverThreshold ? 'turn_on' : 'turn_off';
                const currentState = alarm.state; // 'on' or 'off'
                const expectedState = isOverThreshold ? 'on' : 'off';

                if (currentState !== expectedState) {
                    const request_id = `auto-${Date.now()}`;
                    console.log(`[Automation] Soil Moisture ${soil_moisture}% -> Triggering ${desiredAction} for alarm_1`);
                    
                    // Save action
                    await deviceModel.createAction({
                        request_id,
                        device_id: 'alarm_1',
                        action: desiredAction,
                        desired_state: expectedState
                    });

                    // Publish MQTT
                    const { publishAction } = await import('../client.js');
                    publishAction({ request_id, device_id: 'alarm_1', action: desiredAction });

                    // Emit to UI
                    if (io) io.emit('action:new', { request_id, device_id: 'alarm_1', action: desiredAction });
                }
            }
        }
    } catch (err) {
        console.error('[Automation Error]:', err.message);
    }
};

export { handleData };