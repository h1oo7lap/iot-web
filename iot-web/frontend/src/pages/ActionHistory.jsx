import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import { getActionHistoryPaged, getDevices } from '../services/api.js'
import socket from '../services/socket.js'

const formatTime = (ts) => {
    if (!ts) return '--'
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const ACTION_LABELS = {
    turn_on: 'Turn on',
    turn_off: 'Turn off',
}

export default function ActionHistory() {
    const [rows, setRows] = useState([])
    const [devices, setDevices] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(10)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [actionFilter, setActionFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sortKey, setSortKey] = useState('id')
    const [sortDir, setSortDir] = useState('desc')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const data = await getDevices()
                setDevices(data)
            } catch (e) {
                console.error(e)
            }
        }
        fetchDevices()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await getActionHistoryPaged({
                page,
                limit,
                search,
                filter,
                action: actionFilter,
                status: statusFilter
            })
            setRows(res.data || [])
            setTotal(res.pagination?.total || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [page, limit, search, filter, actionFilter, statusFilter])

    useEffect(() => {
        const onRefresh = () => fetchData()
        socket.on('device:state', onRefresh)
        socket.on('action:timeout', onRefresh)
        socket.on('action:new', onRefresh)
        return () => {
            socket.off('device:state', onRefresh)
            socket.off('action:timeout', onRefresh)
            socket.off('action:new', onRefresh)
        }
    }, [fetchData])

    const sorted = [...rows].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    const columns = [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'name', label: 'Device Name', sortable: true, render: r => r.name || r.device_id },
        {
            key: 'action',
            label: 'Action',
            sortable: true,
            render: r => {
                if (r.device_id === 'alarm_1') {
                    if (r.action === 'turn_on') return 'Warning';
                    if (r.action === 'turn_off') return 'Normal';
                }
                return ACTION_LABELS[r.action] || r.action;
            }
        },
        {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: r => {
                if (r.status === 'success') {
                    const state = r.state || r.action;
                    return ACTION_LABELS[state] || state;
                }
                return r.status;
            }
        },
        { key: 'created_at', label: 'Time', sortable: true, render: r => formatTime(r.created_at) },
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
                placeholder: "Search ID, Name, Time..."
            }}
            filters={[
                {
                    value: filter,
                    onChange: v => { setFilter(v); setPage(1) },
                    title: "Device Filter",
                    options: [
                        { value: 'all', label: 'All Devices' },
                        ...devices.map(d => ({ value: d.device_id, label: d.name }))
                    ]
                },
                {
                    value: actionFilter,
                    onChange: v => { setActionFilter(v); setPage(1) },
                    title: "Action Filter",
                    options: [
                        { value: 'all', label: 'All Actions' },
                        { value: 'turn_on', label: 'Turn on' },
                        { value: 'turn_off', label: 'Turn off' }
                    ]
                },
                {
                    value: statusFilter,
                    onChange: v => { setStatusFilter(v); setPage(1) },
                    title: "Status Filter",
                    options: [
                        { value: 'all', label: 'All Statuses' },
                        { value: 'success', label: 'Success' },
                        { value: 'fail', label: 'Fail' },
                        { value: 'waiting', label: 'Waiting' }
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
