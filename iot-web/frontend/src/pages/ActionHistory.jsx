import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import { getActionHistoryPaged } from '../services/api.js'
import socket from '../services/socket.js'

const formatTime = (ts) => {
    if (!ts) return '--'
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const DEVICE_LABELS = {
    light_1: 'Light',
    fan_1: 'Fan',
    ac_1: 'Air Condition',
}

const ACTION_LABELS = {
    turn_on: 'Turn on',
    turn_off: 'Turn off',
}

export default function ActionHistory() {
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [sortKey, setSortKey] = useState('display_id')
    const [sortDir, setSortDir] = useState('desc')
    const [loading, setLoading] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await getActionHistoryPaged({ page, limit, search, filter })
            setRows(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [page, limit, search, filter])

    useEffect(() => {
        const onRefresh = () => fetchData()
        socket.on('device:state', onRefresh)
        socket.on('action:timeout', onRefresh)
        return () => {
            socket.off('device:state', onRefresh)
            socket.off('action:timeout', onRefresh)
        }
    }, [fetchData])

    const sorted = [...rows].sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey]
        if (sortKey === 'device_name') {
            va = DEVICE_LABELS[a.device_id] || a.device_id
            vb = DEVICE_LABELS[b.device_id] || b.device_id
        }
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    const columns = [
        { key: 'display_id', label: 'ID', sortable: true },
        { key: 'device_name', label: 'Device Name', sortable: true, render: r => DEVICE_LABELS[r.device_id] || r.device_id },
        { key: 'action', label: 'Action', sortable: true, render: r => ACTION_LABELS[r.action] || r.action },
        { key: 'status', label: 'Status', sortable: true, render: r => r.status === 'success' ? (ACTION_LABELS[r.state] || r.state || (ACTION_LABELS[r.action] || r.action)) : r.status },
        { key: 'timestamp', label: 'Time', sortable: true, render: r => formatTime(r.timestamp) },
    ]

    return (
        <DataTable
            title="Action History"
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
                    value: filter,
                    onChange: v => { setFilter(v); setPage(1) },
                    title: "Device Filter",
                    options: [
                        { value: 'all', label: 'All Devices' },
                        { value: 'light_1', label: 'Light' },
                        { value: 'fan_1', label: 'Fan' },
                        { value: 'ac_1', label: 'Air Condition' }
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
