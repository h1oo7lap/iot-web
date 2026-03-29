import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import './App.css'

import Sidebar from './components/Sidebar.jsx'
import SensorChart from './components/SensorChart.jsx'
import DeviceManager from './components/DeviceManager.jsx'
import DataSensor from './pages/DataSensor.jsx'
import ActionHistory from './pages/ActionHistory.jsx'
import Profile from './pages/Profile.jsx'
import Dashboard from './pages/Dashboard.jsx'

import { getSensorLatest, getDevices } from './services/api.js'
import socket from './services/socket.js'

export default function App() {
    const location = useLocation()
    const [sensorData, setSensorData] = useState([])
    const [devices, setDevices] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const [sData, dData] = await Promise.all([getSensorLatest(), getDevices()])
            setSensorData(sData)
            setDevices(dData.map(d => ({ ...d, loading: false })))
        } catch (e) {
            console.error(e)
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

        console.log(`[Control] Command ${action} sent for ${device_id}, waiting...`)

        // Safety timeout in frontend (6s)
        setTimeout(() => {
            setDevices(prev => prev.map(d =>
                (d.device_id === device_id && d.loading) ? { ...d, loading: false } : d
            ))
        }, 6000)
    }

    const isDashboard = location.pathname === '/'
    const appBg = isDashboard ? 'app' : 'app app--white'

    return (
        <div className={appBg}>
            <Sidebar />

            <div className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard sensorData={sensorData} loading={loading} />} />
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
