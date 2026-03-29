import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import './App.css'

import Sidebar from './components/Sidebar.jsx'
import SensorChart from './components/SensorChart.jsx'
import DataSensor from './pages/DataSensor.jsx'
import ActionHistory from './pages/ActionHistory.jsx'
import Profile from './pages/Profile.jsx'
import Dashboard from './pages/Dashboard.jsx'

import { getSensorLatest } from './services/api.js'
import socket from './services/socket.js'

export default function App() {
    const location = useLocation()
    const [sensorData, setSensorData] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        try {
            const sData = await getSensorLatest()
            setSensorData(sData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const onSensorData = (data) => setSensorData(prev => [data, ...prev].slice(0, 20))
        socket.on('sensor:data', onSensorData)
        return () => {
            socket.off('sensor:data', onSensorData)
        }
    }, [])

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
        </div>
    )
}
