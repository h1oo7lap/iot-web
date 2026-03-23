import {
    LineChart, Line, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from 'recharts'

const COLORS = {
    temperature: '#ef4444',
    humidity:    '#3b82f6',
    light:       '#a0a000',
}

const LABELS = {
    temperature: 'Temperature °C',
    humidity:    'Humidity %',
    light:       'Light Level  lx',
}

// Format timestamp → "HH:MM"
const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function SensorChart({ data = [], type = 'temperature' }) {
    const chartData = [...data].reverse().map(d => ({
        time:  formatTime(d.timestamp),
        value: d[type] ?? null,
    })).filter(d => d.value !== null)

    return (
        <div className={`sensor-chart-wrap ${type}`}>
            <div className="chart-label">{LABELS[type]}</div>
            <ResponsiveContainer width="100%" height={110}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 9, fill: '#666' }}
                        interval="preserveStartEnd"
                        tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                        formatter={(v) => [v, LABELS[type]]}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={COLORS[type]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
