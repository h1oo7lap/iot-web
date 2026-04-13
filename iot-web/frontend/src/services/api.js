const BASE_URL = 'http://localhost:3000/api'

export const getSensorLatest = async (limit = 10) => {
    const res = await fetch(`${BASE_URL}/sensors/latest?limit=${limit}`)
    const json = await res.json()
    return json.data || []
}

export const getSensorDataPaged = async ({ page = 1, limit = 10, search = '', value_type = 'all', filter = '', sensor_id = 'all' } = {}) => {
    const params = new URLSearchParams({ page, limit })

    if (value_type && value_type !== 'all') {
        params.append('value_type', value_type)
    }

    if (sensor_id && sensor_id !== 'all') {
        params.append('sensor_id', sensor_id)
    }

    if (search) {
        params.append('search', search)
    }

    const res = await fetch(`${BASE_URL}/sensors?${params}`)
    const json = await res.json()
    return json
}

export const getActionHistoryPaged = async ({ page = 1, limit = 10, search = '', filter = '', action = 'all', status = 'all' } = {}) => {

    const params = new URLSearchParams({ page, limit })

    if (search) {
        params.append('search', search)
    }
    if (filter && filter !== 'all') {
        params.append('device_id', filter)
    }
    if (action && action !== 'all') {
        params.append('action', action)
    }
    if (status && status !== 'all') {
        params.append('status', status)
    }

    const res = await fetch(`${BASE_URL}/devices/actions?${params}`)
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
