const BASE_URL = 'http://localhost:3000/api'

export const getSensorLatest = async (limit = 20) => {
    const res = await fetch(`${BASE_URL}/sensor-data?limit=${limit}`)
    const json = await res.json()
    return json.data || []
}

export const getSensorDataPaged = async ({ page = 1, limit = 7, search = '', filter = '', sensor_id = 'all' } = {}) => {
    const params = new URLSearchParams({ page, limit })
    
    if (filter && filter !== 'all') {
        params.append('value_type', filter)
    }

    if (sensor_id && sensor_id !== 'all') {
        params.append('sensor_id', sensor_id)
    }

    if (search) {
        params.append('search', search)
    }

    const res  = await fetch(`${BASE_URL}/sensor-data?${params}`)
    const json = await res.json()
    return json
}

export const getActionHistoryPaged = async ({ page = 1, limit = 7, search = '', filter = '' } = {}) => {
    const params = new URLSearchParams({ page, limit })
    if (search) {
        params.append('search', search)
    }
    if (filter && filter !== 'all') {
        params.append('device_id', filter) // Ánh xạ filter của dropdown sang device_id
    }
    const res  = await fetch(`${BASE_URL}/actions?${params}`)
    const json = await res.json()
    return json
}

export const getDevices = async () => {
    const res = await fetch(`${BASE_URL}/devices`)
    const json = await res.json()
    return json.data || []
}

export const controlDevice = async (device_id, action) => {
    const res = await fetch(`${BASE_URL}/devices/${device_id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
    })
    return await res.json()
}


