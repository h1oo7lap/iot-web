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
    const [limit, setLimit] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [sensorFilter, setSensorFilter] = useState('all')
    const [sortKey, setSortKey] = useState('display_id')
    const [sortDir, setSortDir] = useState('desc')
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await getSensorDataPaged({ page, limit, search, filter, sensor_id: sensorFilter })
            setRows(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [page, limit, search, filter, sensorFilter])

    const sorted = [...rows].sort((a, b) => {
        const va = a[sortKey] ?? -Infinity
        const vb = b[sortKey] ?? -Infinity
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    const isRawData = (sensorFilter !== 'all') || (filter !== 'all')
    const showValueType = isRawData && filter === 'all'

    const columns = !isRawData ? [
        { key: 'display_id', label: 'ID', sortable: true },
        { key: 'temperature', label: 'Temp (°C)', sortable: true, render: r => r.temperature !== null ? `${r.temperature}°C` : '--' },
        { key: 'humidity', label: 'Hum (%)', sortable: true, render: r => r.humidity !== null ? `${r.humidity}%` : '--' },
        { key: 'light', label: 'Light (lx)', sortable: true, render: r => r.light !== null ? `${r.light} lx` : '--' },
        { key: 'timestamp', label: 'Time', sortable: true, render: r => formatTime(r.timestamp) },
    ] : [
        { key: 'display_id', label: 'ID', sortable: true },
        { key: 'sensor_id', label: 'Sensor', sortable: true },
        ...(showValueType ? [{ key: 'value_type', label: 'Type', sortable: true }] : []),
        { key: 'value', label: 'Value', sortable: true },
        { key: 'timestamp', label: 'Time', sortable: true, render: r => formatTime(r.timestamp) },
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
                    value: sensorFilter,
                    onChange: v => { setSensorFilter(v); setPage(1) },
                    title: "Sensor Filter",
                    options: [
                        { value: 'all', label: 'All Sensors' },
                        { value: 'dht11_1', label: 'DHT11' },
                        { value: 'ldr_1', label: 'Light Sensor' }
                    ]
                },
                {
                    value: filter,
                    onChange: v => { setFilter(v); setPage(1) },
                    title: "Value Filter",
                    options: [
                        { value: 'all', label: 'All Values' },
                        { value: 'temperature', label: 'Temperature' },
                        { value: 'humidity', label: 'Humidity' },
                        { value: 'light', label: 'Light' }
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
