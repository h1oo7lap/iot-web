import { controlDevice } from '../services/api.js'
import fanGif       from '../assets/fan.gif'
import acGif        from '../assets/air-conditioning.gif'
import lightBulbGif from '../assets/light-bulb.gif'
import fanPng       from '../assets/fan.png'
import acPng        from '../assets/air-conditioning.png'
import lightBulbPng from '../assets/light-bulb.png'
import { useState } from 'react'

const DEVICE_ICONS_GIF = {
    fan: fanGif,
    ac: acGif,
    light: lightBulbGif,
}

const DEVICE_ICONS_PNG = {
    fan: fanPng,
    ac: acPng,
    light: lightBulbPng,
}

const DEVICE_LABELS = {
    light_1: 'Light Bedroom',
    fan_1: 'Fan',
    ac_1: 'Air Conditin',
}

export default function DeviceCard({ device, onToggle }) {
    const [isWaiting, setIsWaiting] = useState(false)
    const label = DEVICE_LABELS[device.device_id] ?? device.name
    const isOn = device.state === 'on'

    const handleToggle = async () => {
        if (device.loading || isWaiting) return

        const action = isOn ? 'turn_off' : 'turn_on'

        // 1. Enter "Waiting" state immediately (animation starts)
        setIsWaiting(true)

        // 2. Wait 1 second before sending command
        setTimeout(async () => {
            try {
                await controlDevice(device.device_id, action)
                if (onToggle) onToggle(device.device_id, action)
            } catch (e) {
                console.error('Control error:', e)
            } finally {
                setIsWaiting(false)
            }
        }, 1000)
    }

    const isProcessing = device.loading || isWaiting
    const isAnimating = isOn || isWaiting
    const iconSrc = isAnimating ? DEVICE_ICONS_GIF[device.type] : DEVICE_ICONS_PNG[device.type]

    return (
        <div className={`device-card ${isProcessing ? 'waiting' : ''}`}>
            <img
                src={iconSrc}
                alt={device.type}
                className="device-icon"
            />
            <div className="device-info">
                <div className="device-name">{label}</div>
                <label className={`toggle ${isProcessing ? 'loading' : ''}`}>
                    <input
                        type="checkbox"
                        checked={isOn}
                        onChange={handleToggle}
                        disabled={isProcessing}
                    />
                    <span className="toggle-slider" />
                </label>
            </div>
        </div>
    )
}
