import { BsSearch } from 'react-icons/bs'
import './DataTable.css'

const LIMITS = [7, 10, 20, 50]

export default function DataTable({ 
    title, 
    columns = [], 
    rows = [], 
    loading = false,
    sortKey,
    sortDir,
    onSort,
    pagination = {},
    search = {},
    filters = []
}) {
    const { page, totalPages, setPage, limit, setLimit } = pagination

    const handleSearch = (e) => {
        if (e.key === 'Enter' && search.onSearch) {
            search.onSearch()
        }
    }

    const pageNums = () => {
        const nums = []
        const radius = 1
        nums.push(1)
        if (page > radius + 2) nums.push('...')
        const start = Math.max(2, page - radius)
        const end = Math.min(totalPages - 1, page + radius)
        for (let i = start; i <= end; i++) nums.push(i)
        if (page < totalPages - radius - 1) nums.push('...')
        if (totalPages > 1) nums.push(totalPages)
        return nums
    }

    const SortIcon = ({ col }) => {
        if (sortKey !== col) return <span className="sort-icon">⇅</span>
        return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{title}</h1>
            </div>

            <div className="toolbar">
                {search.setValue && (
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder={search.placeholder || "Search..."}
                            value={search.value}
                            onChange={e => search.setValue(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <BsSearch onClick={search.onSearch} style={{ cursor: 'pointer' }} />
                    </div>
                )}

                {filters.map((f, i) => (
                    <select
                        key={i}
                        className="filter-select"
                        value={f.value}
                        onChange={e => f.onChange(e.target.value)}
                        title={f.title}
                    >
                        {f.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ))}
            </div>

            <div className="table-card">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th 
                                    key={col.key} 
                                    className={col.sortable ? 'sortable' : ''}
                                    onClick={() => col.sortable && onSort(col.key)}
                                >
                                    {col.label} {col.sortable && <SortIcon col={col.key} />}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={columns.length} className="no-data">Loading...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={columns.length} className="no-data">No data</td></tr>
                        ) : rows.map((r, i) => (
                            <tr key={r.display_id || i}>
                                {columns.map(col => (
                                    <td key={col.key}>
                                        {col.render ? col.render(r) : r[col.key]}
                                    </td>
                                ))}
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

                {pageNums().map((n, i) => (
                    n === '...' ? (
                        <span key={`sep-${i}`} className="page-sep">...</span>
                    ) : (
                        <button
                            key={`p-${n}`}
                            className={`page-btn ${n === page ? 'active' : ''}`}
                            onClick={() => setPage(n)}
                        >
                            {n}
                        </button>
                    )
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
