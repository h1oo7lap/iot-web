import { useState, useEffect } from 'react'
import { BsSearch } from 'react-icons/bs'
import './DataSensor.css'
import { getSensorDataPaged } from '../services/api.js'

// Format timestamp → "YYYY-MM-DD HH:mm:ss"
const formatTime = (ts) => {
    if (!ts) return '--'
    const d = new Date(ts)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    return `${date} ${time}`
}

const LIMITS = [7, 10, 20, 50]

export default function DataSensor() {
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(7)

    // Lưu tạm từ khóa search khi gõ
    const [searchInput, setSearchInput] = useState('')

    // Lưu trạng thái filter & search THỰC TẾ dùng để gọi API
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all') // value_type
    const [sensorFilter, setSensorFilter] = useState('all') // sensor_id

    const [sortKey, setSortKey] = useState('display_id')
    const [sortDir, setSortDir] = useState('desc')
    const [loading, setLoading] = useState(false)

    const totalPages = Math.max(1, Math.ceil(total / limit))

    const fetchData = async () => {
        setLoading(true)
        try {
            // Gửi search, filter (value_type), và sensorFilter (sensor_id)
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

    // Xử lý submit khung tìm kiếm
    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setSearch(searchInput)
            setPage(1)
        }
    }

    // Client-side sort cục bộ trang hiện tại
    const sorted = [...rows].sort((a, b) => {
        const va = a[sortKey] ?? -Infinity
        const vb = b[sortKey] ?? -Infinity
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('desc') }
    }

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <span className="sort-icon">⇅</span>
        return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
    }

    const pageNums = () => {
        const nums = []
        const start = Math.max(1, page - 2)
        const end = Math.min(totalPages, start + 4)
        for (let i = start; i <= end; i++) nums.push(i)
        return nums
    }

    // Phân tích dữ liệu trả về xem thuộc mode nào
    // Yêu cầu: 
    // - Lọc theo cảm biến (sensorFilter !== 'all'): hiện ID, Sensor ID, Value Type, Value, Time
    // - Lọc theo value_type (filter !== 'all'): hiện ID, Sensor ID, Value, Time (ẩn Value Type)
    // Nếu bảng trống thì dựa vào state để giữ nguyên header
    const isRawData = (sensorFilter !== 'all') || (filter !== 'all')
    const showValueType = isRawData && filter === 'all'

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Data Sensor</h1>
            </div>

            <div className="toolbar" style={{ gap: '12px' }}>
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search ID, Time, Value..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                    <BsSearch onClick={() => { setSearch(searchInput); setPage(1) }} style={{ cursor: 'pointer' }} />
                </div>

                <select
                    className="filter-select"
                    value={sensorFilter}
                    onChange={e => { setSensorFilter(e.target.value); setPage(1) }}
                    title="Lọc theo cảm biến"
                >
                    <option value="all">All Sensors</option>
                    <option value="dht11_1">DHT11</option>
                    <option value="ldr_1">Light Sensor</option>
                </select>

                <select
                    className="filter-select"
                    value={filter}
                    onChange={e => { setFilter(e.target.value); setPage(1) }}
                    title="Lọc theo loại giá trị"
                >
                    <option value="all">All Values</option>
                    <option value="temperature">Temperature</option>
                    <option value="humidity">Humidity</option>
                    <option value="light">Light</option>
                </select>
            </div>

            <div className="table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            {!isRawData ? (
                                <>
                                    <th onClick={() => handleSort('display_id')}>
                                        ID <SortIcon col="display_id" />
                                    </th>
                                    <th onClick={() => handleSort('temperature')}>
                                        Temperature (°C) <SortIcon col="temperature" />
                                    </th>
                                    <th onClick={() => handleSort('humidity')}>
                                        Humidity (%) <SortIcon col="humidity" />
                                    </th>
                                    <th onClick={() => handleSort('light')}>
                                        Light Level (lx) <SortIcon col="light" />
                                    </th>
                                    <th onClick={() => handleSort('timestamp')}>
                                        Time <SortIcon col="timestamp" />
                                    </th>
                                </>
                            ) : (
                                <>
                                    <th onClick={() => handleSort('display_id')}>
                                        ID <SortIcon col="display_id" />
                                    </th>
                                    <th onClick={() => handleSort('sensor_id')}>
                                        Sensor ID <SortIcon col="sensor_id" />
                                    </th>
                                    {showValueType && (
                                        <th onClick={() => handleSort('value_type')}>
                                            Value Type <SortIcon col="value_type" />
                                        </th>
                                    )}
                                    <th onClick={() => handleSort('value')}>
                                        Value <SortIcon col="value" />
                                    </th>
                                    <th onClick={() => handleSort('timestamp')}>
                                        Time <SortIcon col="timestamp" />
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="no-data">Loading...</td></tr>
                        ) : sorted.length === 0 ? (
                            <tr><td colSpan={6} className="no-data">No data</td></tr>
                        ) : sorted.map((r, i) => (
                            <tr key={`${r.display_id || ''}-${i}`}>
                                {!isRawData ? (
                                    <>
                                        <td>{r.display_id}</td>
                                        <td>{r.temperature !== null ? `${r.temperature}°C` : '--'}</td>
                                        <td>{r.humidity !== null ? `${r.humidity}%` : '--'}</td>
                                        <td>{r.light !== null ? `${r.light} lx` : '--'}</td>
                                        <td>{formatTime(r.timestamp)}</td>
                                    </>
                                ) : (
                                    <>
                                        <td>{r.display_id}</td>
                                        <td>{r.sensor_id}</td>
                                        {showValueType && <td>{r.value_type}</td>}
                                        <td>{r.value}</td>
                                        <td>{formatTime(r.timestamp)}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
