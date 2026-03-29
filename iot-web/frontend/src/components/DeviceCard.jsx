import { controlDevice } from '../services/api.js'
import fanGif       from '../assets/fan.gif'
import acGif        from '../assets/air-conditioning.gif'
import lightBulbGif from '../assets/light-bulb.gif'

const DEVICE_ICONS = {
    fan: fanGif,
    ac: acGif,
    light: lightBulbGif,
}

const DEVICE_LABELS = {
    light_1: 'Light Bedroom',
    fan_1: 'Fan',
    ac_1: 'Air Conditin',
}

export default function DeviceCard({ device, onToggle }) {
    const icon = DEVICE_ICONS[device.type] ?? '🔌'
    const label = DEVICE_LABELS[device.device_id] ?? device.name
    const isOn = device.state === 'on'

    const handleToggle = async () => {
        const action = isOn ? 'turn_off' : 'turn_on'
        try {
            await controlDevice(device.device_id, action)
            if (onToggle) onToggle(device.device_id, action)
        } catch (e) {
            console.error('Control error:', e)
        }
    }

    return (
        <div className={`device-card ${device.loading ? 'loading' : ''}`}>
            <img src={icon} alt={device.type} className="device-icon" />
            <div className="device-info">
                <div className="device-name">{label}</div>
                <label className={`toggle ${device.loading ? 'loading' : ''}`}>
                    <input
                        type="checkbox"
                        checked={isOn}
                        onChange={handleToggle}
                        disabled={device.loading}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>
        </div>
    )
}
