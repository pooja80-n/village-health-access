require('dotenv').config()
const express = require('express')
const cors = require('cors')
const http = require('http')
const bodyParser = require('body-parser')
const { createClient } = require('@supabase/supabase-js')
const { Server } = require('socket.io')
const twilio = require('twilio')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.use(cors())
app.use(bodyParser.json())

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

let twClient = null
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

app.post('/api/profiles', async (req, res) => {
  const p = req.body
  try {
    const { error } = await supabase.from('profiles').insert([{
      id: p.id,
      name: p.name,
      phone: p.phone,
      village: p.village,
      created_at: p.created_at
    }])
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, id: p.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/appointments', async (req, res) => {
  const a = req.body
  try {
    const { error } = await supabase.from('appointments').insert([{
      id: a.id,
      patient_id: a.patientId,
      symptoms: a.symptoms,
      triage: a.triage,
      status: a.status,
      created_at: a.created_at
    }])
    if (error) return res.status(400).json({ error: error.message })
    if (a.triage?.level === 'EMERGENCY' && twClient && process.env.TWILIO_FROM_NUMBER) {
      const dispatcher = process.env.DISPATCHER_NUMBER
      if (dispatcher) {
        await twClient.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to: dispatcher, body: `EMERGENCY for patient ${a.patientId}` })
      }
    }
    res.json({ ok: true, id: a.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/orders', async (req, res) => {
  const o = req.body
  try {
    const { error } = await supabase.from('orders').insert([{
      id: o.id,
      patient_id: o.patientId,
      medicine: o.medicine,
      status: o.status,
      created_at: o.created_at
    }])
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, id: o.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/ambulance', async (req, res) => {
  const r = req.body
  try {
    const { error } = await supabase.from('ambulance_requests').insert([{
      id: r.id,
      profile_id: r.profileId,
      latitude: r.lat || null,
      longitude: r.lng || null,
      appointment_id: r.appointmentId || null,
      requested_at: r.requested_at
    }])
    if (error) return res.status(400).json({ error: error.message })
    if (twClient && process.env.TWILIO_FROM_NUMBER && process.env.DISPATCHER_NUMBER) {
      const msg = `Ambulance requested: ${r.profileId} at ${r.lat || 'unknown'}, ${r.lng || 'unknown'}`
      await twClient.messages.create({ from: process.env.TWILIO_FROM_NUMBER, to: process.env.DISPATCHER_NUMBER, body: msg })
    }
    res.json({ ok: true, message: 'ambulance request saved' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

io.on('connection', socket => {
  console.log('socket connected', socket.id)
  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId)
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id })
  })
  socket.on('signal', data => {
    if (data.to) io.to(data.to).emit('signal', data)
  })
  socket.on('disconnect', () => {})
})

const PORT = process.env.SERVICE_PORT || 4000
server.listen(PORT, () => console.log(`Server running on ${PORT}`))
