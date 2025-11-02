require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { createClient } = require('@supabase/supabase-js')

const app = express()

app.use(cors())
app.use(bodyParser.json())

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env')
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

app.post('/api/profiles', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
  
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
  } catch (e) { 
    res.status(500).json({ error: e.message }) 
  }
})

app.post('/api/appointments', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
  
  const a = req.body
  try {
    const { error } = await supabase.from('appointments').insert([{
      id: a.id,
      patient_id: a.patientId,
      date: a.date,
      time: a.time,
      status: a.status || 'scheduled',
      notes: a.notes
    }])
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, id: a.id })
  } catch (e) { 
    res.status(500).json({ error: e.message }) 
  }
})

app.get('/api/appointments', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
  
  try {
    const { data, error } = await supabase.from('appointments').select('*')
    if (error) return res.status(400).json({ error: error.message })
    res.json({ data })
  } catch (e) { 
    res.status(500).json({ error: e.message }) 
  }
})

app.post('/api/sync', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
  
  const { profiles, appointments } = req.body
  try {
    let results = { profiles: [], appointments: [] }
    
    if (profiles && profiles.length > 0) {
      const { error: profileError } = await supabase.from('profiles').upsert(profiles)
      if (profileError) return res.status(400).json({ error: profileError.message })
      results.profiles = profiles
    }
    
    if (appointments && appointments.length > 0) {
      const { error: apptError } = await supabase.from('appointments').upsert(appointments)
      if (apptError) return res.status(400).json({ error: apptError.message })
      results.appointments = appointments
    }
    
    res.json({ ok: true, ...results })
  } catch (e) { 
    res.status(500).json({ error: e.message }) 
  }
})

app.post('/api/orders', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
  
  const order = req.body
  try {
    const { error } = await supabase.from('orders').insert([{
      id: order.id,
      patient_id: order.patientId,
      items: order.items,
      status: order.status || 'pending',
      created_at: order.created_at
    }])
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, id: order.id })
  } catch (e) { 
    res.status(500).json({ error: e.message }) 
  }
})

app.post('/api/ambulance', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' })
  
  const request = req.body
  try {
    const { error } = await supabase.from('ambulance_requests').insert([{
      id: request.id,
      patient_id: request.patientId,
      location: request.location,
      priority: request.priority || 'normal',
      status: request.status || 'pending',
      created_at: request.created_at
    }])
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true, id: request.id })
  } catch (e) { 
    res.status(500).json({ error: e.message }) 
  }
})

app.get('/api/health', (req, res) => res.json({ ok: true, mode: 'serverless' }))

module.exports = app