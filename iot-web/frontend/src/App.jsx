import { useState, useEffect, useCallback } from 'react'
import './App.css'

import Sidebar       from './components/Sidebar.jsx'
import SensorChart   from './components/SensorChart.jsx'
import DeviceManager from './components/DeviceManager.jsx'
import DataSensor    from './pages/DataSensor.jsx'
import ActionHistory from './pages/ActionHistory.jsx'
import Profile       from './pages/Profile.jsx'

import { getSensorLatest, getDevices } from './services/api.js'
import socket from './services/socket.js'

const getLatest = (data, key) => {
    if (!data || data.length === 0) return '--'
    const val = data[0]?.[key]
    return val !== null && val !== undefined ? val : '--'
}

export default function App() {
    const [page,       setPage]       = useState('dashboard')
    const [sensorData, setSensorData] = useState([])
    const [devices,    setDevices]    = useState([])
    const [loading,    setLoading]    = useState(true)

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
                d.device_id === device_id ? { ...d, state } : d
            ))
        }
        socket.on('sensor:data',  onSensorData)
        socket.on('device:state', onDeviceState)
        return () => {
            socket.off('sensor:data',  onSensorData)
            socket.off('device:state', onDeviceState)
        }
    }, [])

    const handleToggle = (device_id, action) => {
        // Không cập nhật local state ở đây nữa (optimistic UI)
        // Để onDeviceState (socket) tự cập nhật khi nhận được esp/state phản hồi thực tế từ ESP
        console.log(`[Control] Command ${action} sent for ${device_id}, waiting for hardware confirm...`)
    }

    const temp  = getLatest(sensorData, 'temperature')
    const hum   = getLatest(sensorData, 'humidity')
    const light = getLatest(sensorData, 'light')

    // Dashboard thì có Device Manager bên phải, các trang khác thì không
    const showDeviceManager = page === 'dashboard'
    const appBg = page === 'dashboard' ? 'app' : 'app app--white'

    return (
        <div className={appBg}>
            <Sidebar active={page} onNavigate={setPage} />

            <div className="main-content">

                {/* ===== DASHBOARD ===== */}
                {page === 'dashboard' && (
                    <>
                        <h1 className="page-title">Dashboard</h1>
                        <div className="room-status">
                            <div className="room-status-title">Room Status</div>
                            {loading ? (
                                <p style={{ color: '#666', fontSize: 14 }}>Loading...</p>
                            ) : (
                                <>
                                    <div className="sensor-row">
                                        <div className="sensor-badge temperature">
                                            <span className="sensor-badge-icon">🌡️</span>
                                            <span className="sensor-badge-value">{temp !== '--' ? `${temp}°C` : '--'}</span>
                                        </div>
                                        <SensorChart data={sensorData} type="temperature" />
                                    </div>
                                    <div className="sensor-row">
                                        <div className="sensor-badge humidity">
                                            <span className="sensor-badge-icon">💧</span>
                                            <span className="sensor-badge-value">{hum !== '--' ? `${hum}%` : '--'}</span>
                                        </div>
                                        <SensorChart data={sensorData} type="humidity" />
                                    </div>
                                    <div className="sensor-row">
                                        <div className="sensor-badge light">
                                            <span className="sensor-badge-icon">☀️</span>
                                            <span className="sensor-badge-value">{light !== '--' ? `${light} lx` : '--'}</span>
                                        </div>
                                        <SensorChart data={sensorData} type="light" />
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {/* ===== DATA SENSOR ===== */}
                {page === 'data-sensor' && <DataSensor />}

                {/* ===== ACTION HISTORY ===== */}
                {page === 'history' && <ActionHistory />}

                {/* ===== PROFILE ===== */}
                {page === 'profile' && <Profile />}

            </div>

            {/* Device Manager chỉ hiện ở Dashboard */}
            {showDeviceManager && (
                <DeviceManager devices={devices} onToggle={handleToggle} />
            )}
        </div>
    )
}


