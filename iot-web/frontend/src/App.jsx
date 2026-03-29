import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import './App.css'

import Sidebar from './components/Sidebar.jsx'
import SensorChart from './components/SensorChart.jsx'
import DeviceManager from './components/DeviceManager.jsx'
import DataSensor from './pages/DataSensor.jsx'
import ActionHistory from './pages/ActionHistory.jsx'
import Profile from './pages/Profile.jsx'

import { getSensorLatest, getDevices } from './services/api.js'
import socket from './services/socket.js'

const getLatest = (data, key) => {
    if (!data || data.length === 0) return '--'
    const val = data[0]?.[key]
    return val !== null && val !== undefined ? val : '--'
}

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
    }
    else if (type === 'humidity') {
        const p = Math.min(100, val)
        const hue = 185
        const sat = 80
        const lightLeft = 85 - (p * 0.4)
        const lightRight = 95

        g1 = `hsl(${hue}, ${sat}%, ${lightLeft}%)`
        g2 = `hsl(${hue}, ${sat}%, ${lightRight}%)`
        glow = `hsla(${hue}, ${sat}%, 40%, 0.3)`
    }
    // 🔥 PHẦN ÁNH SÁNG ĐÃ ĐƯỢC LÀM LẠI HOÀN TOÀN 🔥
    else if (type === 'light') {
        const p = Math.min(100, (val / 1024) * 100)

        // Hue: Đẩy từ vàng cam (45) sang vàng chanh gắt (60) khi ra nắng
        const hue = 45 + (p * 0.15)

        // Saturation: Chỗ râm màu xỉn (40%), ra nắng gắt màu rực rỡ (100%)
        const sat = 40 + (p * 0.6)

        // Lightness trái (g1): Chỗ râm thì tối sầm (35%), nắng gắt thì sáng rực (85%)
        const lightLeft = 35 + (p * 0.5)

        // Lightness phải (g2): Luôn sáng hơn bên trái 10% để tạo hiệu ứng Gradient bóng bẩy
        const lightRight = 45 + (p * 0.5)

        g1 = `hsl(${hue}, ${sat}%, ${lightLeft}%)`
        g2 = `hsl(${hue}, ${sat}%, ${lightRight}%)`

        // Đổ bóng: Càng ra nắng gắt, viền sáng tỏa ra càng mạnh (từ 0.1 lên 0.5)
        glow = `hsla(${hue}, ${sat}%, 50%, ${0.1 + (p * 0.004)})`

        // ✅ Tự động đổi màu chữ: Nếu thẻ đang tối (< 60%) -> Chữ trắng. Ngược lại -> Chữ nâu đậm
        textColor = lightLeft < 60 ? '#ffffff' : '#4a3f00'
    }

    return {
        background: `linear-gradient(to right, ${g1}, ${g2})`,
        boxShadow: `0 6px 18px ${glow}`,
        color: textColor,
        border: '0px solid rgba(0,0,0,0.01)',
        transition: 'all 0.5s ease-out' // Tăng độ mượt khi mây bay qua che nắng
    }
}

export default function App() {
    const location = useLocation()
    const [sensorData, setSensorData] = useState([])
    const [devices, setDevices] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const [sensors, devs] = await Promise.all([
                getSensorLatest(20),
                getDevices(),
            ])
            setSensorData(sensors)
            setDevices(devs)
        } catch (e) {
            console.error('Fetch error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // Socket.IO realtime
    useEffect(() => {
        const onSensorData = (data) => setSensorData(prev => [data, ...prev].slice(0, 20))
        const onDeviceState = ({ device_id, state }) => {
            setDevices(prev => prev.map(d =>
                d.device_id === device_id ? { ...d, state, loading: false } : d
            ))
        }

        const onActionTimeout = ({ device_id }) => {
            console.log(`[App] Action timeout for ${device_id}, reverting...`)
            setDevices(prev => prev.map(d =>
                d.device_id === device_id ? { ...d, loading: false } : d
            ))
        }

        socket.on('sensor:data', onSensorData)
        socket.on('device:state', onDeviceState)
        socket.on('action:timeout', onActionTimeout)

        return () => {
            socket.off('sensor:data', onSensorData)
            socket.off('device:state', onDeviceState)
            socket.off('action:timeout', onActionTimeout)
        }
    }, [])

    const handleToggle = (device_id, action) => {
        setDevices(prev => prev.map(d =>
            d.device_id === device_id ? { ...d, loading: true } : d
        ))
        console.log(`[Control] Command ${action} sent for ${device_id}, waiting for hardware confirm...`)
    }

    const temp = getLatest(sensorData, 'temperature')
    const hum = getLatest(sensorData, 'humidity')
    const light = getLatest(sensorData, 'light')

    const isDashboard = location.pathname === '/'
    const appBg = isDashboard ? 'app' : 'app app--white'

    return (
        <div className={appBg}>
            <Sidebar />

            <div className="main-content">
                <Routes>
                    <Route path="/" element={
                        <>
                            <h1 className="page-title">Dashboard</h1>
                            <div className="room-status">
                                <div className="room-status-title">Room Status</div>
                                {loading ? (
                                    <p style={{ color: '#666', fontSize: 14 }}>Loading...</p>
                                ) : (
                                    <>
                                        <div className="sensor-row">
                                            <div className="sensor-badge temperature" style={getBadgeStyle('temperature', temp)}>
                                                <span className="sensor-badge-icon">🌡️</span>
                                                <span className="sensor-badge-value">{temp !== '--' ? `${temp}°C` : '--'}</span>
                                            </div>
                                            <SensorChart data={sensorData} type="temperature" />
                                        </div>
                                        <div className="sensor-row">
                                            <div className="sensor-badge humidity" style={getBadgeStyle('humidity', hum)}>
                                                <span className="sensor-badge-icon">💧</span>
                                                <span className="sensor-badge-value">{hum !== '--' ? `${hum}%` : '--'}</span>
                                            </div>
                                            <SensorChart data={sensorData} type="humidity" />
                                        </div>
                                        <div className="sensor-row">
                                            <div className="sensor-badge light" style={getBadgeStyle('light', light)}>
                                                <span className="sensor-badge-icon">☀️</span>
                                                <span className="sensor-badge-value">{light !== '--' ? `${light} lx` : '--'}</span>
                                            </div>
                                            <SensorChart data={sensorData} type="light" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    } />
                    <Route path="/data-sensor" element={<DataSensor />} />
                    <Route path="/history" element={<ActionHistory />} />
                    <Route path="/profile" element={<Profile />} />
                </Routes>
            </div>

            {isDashboard && (
                <DeviceManager devices={devices} onToggle={handleToggle} />
            )}
        </div>
    )
}


