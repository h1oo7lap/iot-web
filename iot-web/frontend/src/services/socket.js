import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
    transports: ['websocket'],
    autoConnect: true,
    reconnectionDelay: 2000,
})

socket.on('connect',    () => console.log('[Socket] Connected'))
socket.on('disconnect', () => console.log('[Socket] Disconnected'))
socket.on('connect_error', (err) => console.log('[Socket] Error:', err.message))

export default socket
