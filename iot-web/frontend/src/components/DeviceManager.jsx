import DeviceCard from './DeviceCard.jsx'

export default function DeviceManager({ devices, onToggle }) {
    return (
        <div className="device-manager">
            <div className="device-manager-title">Device Manager</div>

            {devices.map(device => (
                <DeviceCard key={device.device_id} device={device} onToggle={onToggle} />
            ))}

            <button className="add-btn" title="Add device">+</button>
        </div>
    )
}
