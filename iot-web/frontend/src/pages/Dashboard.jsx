import SensorBadge from '../components/SensorBadge'
import SensorChart from '../components/SensorChart'
import './Dashboard.css'

const getLatest = (data, key) => {
    if (!data || data.length === 0) return '--'
    const val = data[0]?.[key]
    return val !== null && val !== undefined ? val : '--'
}

export default function Dashboard({ sensorData, loading }) {
    const temp = getLatest(sensorData, 'temperature')
    const hum = getLatest(sensorData, 'humidity')
    const light = getLatest(sensorData, 'light')

    return (
        <>
            <h1 className="page-title">Dashboard</h1>
            <div className="room-status">
                <div className="room-status-title">Room Status</div>
                {loading ? (
                    <p style={{ color: '#666', fontSize: 14 }}>Loading...</p>
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
        </>
    )
}
