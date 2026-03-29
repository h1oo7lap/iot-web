import { useState, useEffect } from 'react'
import { BsSearch } from 'react-icons/bs'
import './DataSensor.css' // Tái sử dụng CSS layout, toolbar, table, pagination từ DataSensor
import { getActionHistoryPaged } from '../services/api.js'
import socket from '../services/socket.js'


// Format timestamp → "YYYY-MM-DD HH:mm:ss"
const formatTime = (ts) => {
    if (!ts) return '--'
    const d = new Date(ts)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    return `${date} ${time}`
}

const DEVICE_LABELS = {
    light_1: 'Light Bedroom',
    fan_1:   'Fan',
    ac_1:    'Air Condition',
}

const ACTION_LABELS = {
    turn_on:  'On',
    turn_off: 'Off',
}

const LIMITS = [7, 10, 20, 50]

export default function ActionHistory() {
    const [rows,       setRows]       = useState([])
    const [total,      setTotal]      = useState(0)
    const [page,       setPage]       = useState(1)
    const [limit,      setLimit]      = useState(7)
    const [searchInput, setSearchInput] = useState('')
    const [search,     setSearch]     = useState('')
    const [filter,     setFilter]     = useState('all') // filter theo thiết bị
    const [sortKey,    setSortKey]    = useState('display_id')
    const [sortDir,    setSortDir]    = useState('desc')
    const [loading,    setLoading]    = useState(false)

    const totalPages = Math.max(1, Math.ceil(total / limit))

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

    // Socket.IO realtime refresh
    useEffect(() => {
        const onRefresh = () => fetchData()
        
        socket.on('device:state',    onRefresh)
        socket.on('action:timeout',  onRefresh)

        return () => {
            socket.off('device:state',   onRefresh)
            socket.off('action:timeout', onRefresh)
        }
    }, [fetchData])

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setSearch(searchInput)
            setPage(1)
        }
    }

    // Client-side sort
    const sorted = [...rows].sort((a, b) => {
        let va = a[sortKey]
        let vb = b[sortKey]

        // Custom sort mapping for device name or action for better UX
        if (sortKey === 'device_name') {
            va = DEVICE_LABELS[a.device_id] || a.device_id
            vb = DEVICE_LABELS[b.device_id] || b.device_id
        }

        if (sortDir === 'asc') return va > vb ? 1 : -1
        return va < vb ? 1 : -1
    })

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('desc') }
    }

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <span className="sort-icon">⇅</span>
        return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
    }

    // Pagination numbers
    const pageNums = () => {
        const nums = []
        const start = Math.max(1, page - 2)
        const end   = Math.min(totalPages, start + 4)
        for (let i = start; i <= end; i++) nums.push(i)
        return nums
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Action History</h1>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search Any..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                    <BsSearch onClick={() => { setSearch(searchInput); setPage(1) }} style={{ cursor: 'pointer' }} />
                </div>

                <select
                    className="filter-select"
                    value={filter}
                    onChange={e => { setFilter(e.target.value); setPage(1) }}
                >
                    <option value="all">All Devices</option>
                    <option value="light_1">Light Bedroom</option>
                    <option value="fan_1">Fan</option>
                    <option value="ac_1">Air Condition</option>
                </select>
            </div>

            {/* Table */}
            <div className="table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('display_id')}>
                                ID <SortIcon col="display_id" />
                            </th>
                            <th onClick={() => handleSort('device_name')}>
                                Device Name <SortIcon col="device_name" />
                            </th>
                            <th onClick={() => handleSort('action')}>
                                Action <SortIcon col="action" />
                            </th>
                            <th onClick={() => handleSort('status')}>
                                Status <SortIcon col="status" />
                            </th>
                            <th onClick={() => handleSort('timestamp')}>
                                Time <SortIcon col="timestamp" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="no-data">Loading...</td></tr>
                        ) : sorted.length === 0 ? (
                            <tr><td colSpan={5} className="no-data">No data</td></tr>
                        ) : sorted.map(r => (
                            <tr key={r.display_id}>
                                <td>{r.display_id}</td>
                                <td>{DEVICE_LABELS[r.device_id] || r.device_id}</td>
                                <td>{ACTION_LABELS[r.action] || r.action}</td>
                                <td>{r.status === 'success' ? (ACTION_LABELS[r.state] || r.state || (ACTION_LABELS[r.action] || r.action)) : r.status}</td>
                                <td>{formatTime(r.timestamp)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="pagination-bar">
                <select
                    className="rows-select"
                    value={limit}
                    onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                >
                    {LIMITS.map(l => (
                        <option key={l} value={l}>{l} rows</option>
                    ))}
                </select>

                <button
                    className="page-btn page-btn-text"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    Pre
                </button>

                {pageNums().map(n => (
                    <button
                        key={n}
                        className={`page-btn ${n === page ? 'active' : ''}`}
                        onClick={() => setPage(n)}
                    >
                        {n}
                    </button>
                ))}

                <button
                    className="page-btn page-btn-text"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    )
}
