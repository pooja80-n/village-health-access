import axios from 'axios'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
export async function sendOp(op) {
  if (!navigator.onLine) throw new Error('Offline')
  const route = {
    createProfile: '/profiles',
    createAppointment: '/appointments',
    placeOrder: '/orders',
    ambulanceRequest: '/ambulance'
  }[op.type]
  if (!route) throw new Error('Unknown op')
  return axios.post(`${API_BASE}${route}`, op.payload)
}
export default sendOp
