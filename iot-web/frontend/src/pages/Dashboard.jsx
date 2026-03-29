import { useState, useEffect, useCallback } from 'react'
import SensorBadge from '../components/SensorBadge'
import SensorChart from '../components/SensorChart'
import DeviceManager from '../components/DeviceManager'
import { getDevices } from '../services/api.js'
import socket from '../services/socket.js'
import './Dashboard.css'

const getLatest = (data, key) => {
    if (!data || data.length === 0) return '--'
    const val = data[0]?.[key]
    return val !== null && val !== undefined ? val : '--'
}

export default function Dashboard({ sensorData, loading: sensorLoading }) {
    const [devices, setDevices] = useState([])
    const [deviceLoading, setDeviceLoading] = useState(true)

    const fetchDevices = useCallback(async () => {
        try {
            const dData = await getDevices()
            setDevices(dData.map(d => ({ ...d, loading: false })))
        } catch (e) {
            console.error(e)
        } finally {
            setDeviceLoading(false)
        }
    }, [])

    useEffect(() => { fetchDevices() }, [fetchDevices])

    // Device Socket Listeners
    useEffect(() => {
        const onDeviceState = ({ device_id, state }) => {
            setDevices(prev => prev.map(d =>
                d.device_id === device_id ? { ...d, state, loading: false } : d
            ))
        }

        const onActionTimeout = ({ device_id }) => {
            console.log(`[Dashboard] Action timeout for ${device_id}, reverting...`)
            setDevices(prev => prev.map(d =>
                d.device_id === device_id ? { ...d, loading: false } : d
            ))
        }

        socket.on('device:state', onDeviceState)
        socket.on('action:timeout', onActionTimeout)

        return () => {
            socket.off('device:state', onDeviceState)
            socket.off('action:timeout', onActionTimeout)
        }
    }, [])

    const handleToggle = (device_id, action) => {
        setDevices(prev => prev.map(d =>
            d.device_id === device_id ? { ...d, loading: true } : d
        ))
        
        console.log(`[Dashboard Control] Command ${action} sent for ${device_id}, waiting...`)

        // Safety timeout in frontend (6s)
        setTimeout(() => {
            setDevices(prev => prev.map(d =>
                (d.device_id === device_id && d.loading) ? { ...d, loading: false } : d
            ))
        }, 6000)
    }

    const temp = getLatest(sensorData, 'temperature')
    const hum = getLatest(sensorData, 'humidity')
    const light = getLatest(sensorData, 'light')

    return (
        <div className="dashboard-layout">
            <div className="dashboard-main">
                <h1 className="page-title">Dashboard</h1>
                <div className="room-status">
                    <div className="room-status-title">Room Status</div>
                    {sensorLoading ? (
                        <p style={{ color: '#666', fontSize: 14 }}>Loading Sensors...</p>
                    ) : (
                        <>
                            <div className="sensor-row">
                                <SensorBadge type="temperature" value={temp} />
                                <SensorChart data={sensorData} type="temperature" />
                            </div>
                            <div className="sensor-row">
                                <SensorBadge type="humidity" value={hum} />
                                <SensorChart data={sensorData} type="humidity" />
                            </div>
                            <div className="sensor-row">
                                <SensorBadge type="light" value={light} />
                                <SensorChart data={sensorData} type="light" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <DeviceManager devices={devices} onToggle={handleToggle} />
        </div>
    )
}
