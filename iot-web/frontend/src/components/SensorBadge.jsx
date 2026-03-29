import tempGif from '../assets/temperature.gif'
import humGif  from '../assets/humidity.gif'
import sunGif  from '../assets/sun.gif'
import './SensorBadge.css'

const getBadgeStyle = (type, value) => {
    if (value === '--' || value === null || value === undefined) return {}

    const val = parseFloat(value)
    let g1, g2, glow, textColor = '#1f2937'

    if (type === 'temperature') {
        const p = Math.min(100, (val / 50) * 100)
        const hue = 355
        const sat = 90
        const lightLeft = 85 - (p * 0.4)
        const lightRight = 95
        g1 = `hsl(${hue}, ${sat}%, ${lightLeft}%)`
        g2 = `hsl(${hue}, ${sat}%, ${lightRight}%)`
        glow = `hsla(${hue}, ${sat}%, 50%, 0.3)`
    } else if (type === 'humidity') {
        const p = Math.min(100, val)
        const hue = 185
        const sat = 80
        const lightLeft = 85 - (p * 0.4)
        const lightRight = 95
        g1 = `hsl(${hue}, ${sat}%, ${lightLeft}%)`
        g2 = `hsl(${hue}, ${sat}%, ${lightRight}%)`
        glow = `hsla(${hue}, ${sat}%, 40%, 0.3)`
    } else if (type === 'light') {
        const p = Math.min(100, (val / 1024) * 100)
        const hue = 45 + (p * 0.15)
        const sat = 40 + (p * 0.6)
        const lightLeft = 35 + (p * 0.5)
        const lightRight = 45 + (p * 0.5)
        g1 = `hsl(${hue}, ${sat}%, ${lightLeft}%)`
        g2 = `hsl(${hue}, ${sat}%, ${lightRight}%)`
        glow = `hsla(${hue}, ${sat}%, 50%, ${0.1 + (p * 0.004)})`
        textColor = lightLeft < 60 ? '#ffffff' : '#4a3f00'
    }

    return {
        background: `linear-gradient(to right, ${g1}, ${g2})`,
        boxShadow: `0 6px 18px ${glow}`,
        color: textColor,
    }
}

export default function SensorBadge({ type, value }) {
    const icon = type === 'temperature' ? tempGif : type === 'humidity' ? humGif : sunGif
    const unit = type === 'temperature' ? '°C' : type === 'humidity' ? '%' : ' lx'
    const displayValue = value !== '--' ? `${value}${unit}` : '--'

    return (
        <div className={`sensor-badge ${type}`} style={getBadgeStyle(type, value)}>
            <img src={icon} alt={type} className="sensor-badge-icon" />
            <span className="sensor-badge-value">{displayValue}</span>
        </div>
    )
}
