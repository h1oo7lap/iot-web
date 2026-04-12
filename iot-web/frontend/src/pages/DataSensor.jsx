import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import { getSensorDataPaged } from '../services/api.js'

const formatTime = (ts) => {
    if (!ts) return '--'
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export default function DataSensor() {
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [filterbyValueType, setFilterbyValueType] = useState('all')
    const [filterbySensor, setFilterbySensor] = useState('all')
    const [sortKey, setSortKey] = useState('message_id')
    const [sortDir, setSortDir] = useState('desc')
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await getSensorDataPaged({
                page,
                limit,
                search,
                filter: filterbyValueType,
                sensor_id: filterbySensor
            })
            setRows(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [page, limit, search, filterbyValueType, filterbySensor])

    const sorted = [...rows].sort((a, b) => {
        const va = a[sortKey] ?? -Infinity
        const vb = b[sortKey] ?? -Infinity
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    const isRawData = (filterbySensor !== 'all') || (filterbyValueType !== 'all')
    const showValueType = isRawData && filterbyValueType === 'all'

    const columns = !isRawData ? [
        { key: 'message_id', label: 'ID', sortable: true },
        { key: 'temperature', label: 'Temp (°C)', sortable: true, render: r => r.temperature !== null ? `${r.temperature}°C` : '--' },
        { key: 'humidity', label: 'Hum (%)', sortable: true, render: r => r.humidity !== null ? `${r.humidity}%` : '--' },
        { key: 'light', label: 'Light (lx)', sortable: true, render: r => r.light !== null ? `${r.light} lx` : '--' },
        { key: 'soil_moisture', label: 'Soil Moist (%)', sortable: true, render: r => r.soil_moisture !== null ? `${r.soil_moisture}%` : '--' },
        { key: 'created_at', label: 'Time', sortable: true, render: r => formatTime(r.created_at) },
    ] : [
        { key: 'message_id', label: 'ID', sortable: true },
        { key: 'sensor_id', label: 'Sensor', sortable: true },
        ...(showValueType ? [{ key: 'value_type', label: 'Type', sortable: true }] : []),
        { key: 'value', label: 'Value', sortable: true },
        { key: 'created_at', label: 'Time', sortable: true, render: r => formatTime(r.created_at) },
    ]

    return (
        <DataTable
            title="Data Sensor"
            columns={columns}
            rows={sorted}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={(key) => {
                if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                else { setSortKey(key); setSortDir('desc') }
            }}
            search={{
                value: searchInput,
                setValue: setSearchInput,
                onSearch: () => { setSearch(searchInput); setPage(1) },
                placeholder: "Search ID, Time..."
            }}
            filters={[
                {
                    value: filterbySensor,
                    onChange: v => { setFilterbySensor(v); setPage(1) },
                    title: "Sensor Filter",
                    options: [
                        { value: 'all', label: 'All Sensors' },
                        { value: 'dht11_1', label: 'dht11' },
                        { value: 'ldr_1', label: 'ldr' },
                        { value: 'sm_1', label: 'sm' }
                    ]
                },
                {
                    value: filterbyValueType,
                    onChange: v => { setFilterbyValueType(v); setPage(1) },
                    title: "Value Filter",
                    options: [
                        { value: 'all', label: 'All Values' },
                        { value: 'temperature', label: 'Temperature' },
                        { value: 'humidity', label: 'Humidity' },
                        { value: 'light', label: 'Light' },
                        { value: 'soil_moisture', label: 'Soil Moisture' }
                    ]
                }
            ]}
            pagination={{
                page,
                totalPages: Math.ceil(total / limit),
                setPage,
                limit,
                setLimit
            }}
        />
    )
}
