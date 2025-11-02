import React, { useEffect, useState } from 'react'
import Header from './components/Header'
import OfflineBanner from './components/OfflineBanner'
import PatientForm from './components/PatientForm'
import PatientList from './components/PatientList'
import DashboardCard from './components/DashboardCard'
import { useTranslation } from 'react-i18next'
import { supabase } from './services/supabaseClient'
import { sendOp } from './services/syncService'

function openDB(name='vha-db', v=1) {
  return new Promise((res, rej) => {
    const req = indexedDB.open(name, v)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('appointments')) db.createObjectStore('appointments', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('orders')) db.createObjectStore('orders', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { autoIncrement: true })
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}
async function idbPut(store, item) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(item)
    tx.oncomplete = () => res(true)
    tx.onerror = () => rej(tx.error)
  })
}
async function idbGetAll(store) {
  const db = await openDB()
  return new Promise((res,rej) => {
    const tx = db.transaction(store, 'readonly')
    const r = tx.objectStore(store).getAll()
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbAddToQueue(op) {
  const db = await openDB()
  return new Promise((res,rej) => {
    const tx = db.transaction('syncQueue','readwrite')
    tx.objectStore('syncQueue').add(op)
    tx.oncomplete = () => res(true)
    tx.onerror = () => rej(tx.error)
  })
}
async function idbGetQueue() {
  const db = await openDB()
  return new Promise((res,rej) => {
    const tx = db.transaction('syncQueue','readonly')
    const r = tx.objectStore('syncQueue').getAll()
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbClearQueue() {
  const db = await openDB()
  return new Promise((res,rej) => {
    const tx = db.transaction('syncQueue','readwrite')
    tx.objectStore('syncQueue').clear()
    tx.oncomplete = () => res(true)
    tx.onerror = () => rej(tx.error)
  })
}

const uid = () => Math.random().toString(36).slice(2,9)
const nowISO = () => new Date().toISOString()

function triage(symptoms=[]) {
  const s = symptoms.map(x => x.toLowerCase())
  if (s.includes('chest pain') || s.includes('difficulty breathing')) return { level:'EMERGENCY', advice:'Call ambulance now' }
  if (s.includes('fever') && s.includes('rash')) return { level:'URGENT', advice:'Visit clinic' }
  if (s.includes('fever') || s.includes('cough')) return { level:'ADVICE', advice:'Home care' }
  return { level:'UNKNOWN', advice:'Ask provider' }
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [online, setOnline] = useState(navigator.onLine)
  const [profiles, setProfiles] = useState([])
  const [appointments, setAppointments] = useState([])
  const [orders, setOrders] = useState([])
  const [queue, setQueue] = useState([])
  const [log, setLog] = useState([])

  const [pForm, setPForm] = useState({ name:'', phone:'', village:'' })
  const [symptoms, setSymptoms] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(()=>{ (async ()=> {
    setProfiles(await idbGetAll('profiles'))
    setAppointments(await idbGetAll('appointments'))
    setOrders(await idbGetAll('orders'))
    setQueue(await idbGetQueue())
  })()
    const onOnline = ()=>{ setOnline(true); setLog(l=>[`Online ${nowISO()}`,...l].slice(0,80)); trySync() }
    const onOffline = ()=>{ setOnline(false); setLog(l=>['Offline — queued locally',...l].slice(0,80)) }
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline)
    return ()=>{ window.removeEventListener('online',onOnline); window.removeEventListener('offline',onOffline) }
  },[])

  async function setLang(lang) { i18n.changeLanguage(lang) }

  async function createProfile(e) {
    e?.preventDefault()
    const p = { id: uid(), ...pForm, created_at: nowISO() }
    await idbPut('profiles', p)
    setProfiles(await idbGetAll('profiles'))
    await idbAddToQueue({ type:'createProfile', payload:p })
    setQueue(await idbGetQueue())
    setLog(l=>[`Saved ${p.name}`,...l].slice(0,80))
    setPForm({ name:'', phone:'', village:'' })
    if (navigator.onLine) trySync()
  }

  async function addAppointment(e) {
    e?.preventDefault()
    if (!selected) return alert(t('selectPatient'))
    const sArr = symptoms.split(',').map(x=>x.trim()).filter(Boolean)
    const t = triage(sArr)
    const ap = { id: uid(), patientId:selected.id, symptoms:sArr, triage:t, status:'pending', created_at: nowISO() }
    await idbPut('appointments', ap)
    setAppointments(await idbGetAll('appointments'))
    await idbAddToQueue({ type:'createAppointment', payload:ap })
    setQueue(await idbGetQueue())
    setLog(l=>[`Appointment queued (${t.level})`,...l].slice(0,80))
    setSymptoms('')
    if (t.level==='EMERGENCY') requestAmbulance(selected, ap)
    if (navigator.onLine) trySync()
  }

  async function placeOrder(med) {
    if (!selected) return alert(t('selectPatient'))
    const ord = { id: uid(), patientId:selected.id, medicine:med, status:'ordered', created_at: nowISO() }
    await idbPut('orders', ord)
    setOrders(await idbGetAll('orders'))
    await idbAddToQueue({ type:'placeOrder', payload:ord })
    setQueue(await idbGetQueue())
    setLog(l=>[`Order queued: ${med}`,...l].slice(0,80))
    if (navigator.onLine) trySync()
  }

  async function requestAmbulance(profile, appointment=null) {
    setLog(l=>['Ambulance requested — locating',...l].slice(0,80))
    if (!navigator.geolocation) { setLog(l=>['GPS not available — saved fallback',...l].slice(0,80)); await idbAddToQueue({ type:'ambulanceRequest', payload:{ id:uid(), profileId:profile.id, requested_at:nowISO() } }); setQueue(await idbGetQueue()); return }
    navigator.geolocation.getCurrentPosition(async pos => {
      const payload = { id: uid(), profileId:profile.id, lat: pos.coords.latitude, lng: pos.coords.longitude, appointmentId: appointment?.id || null, requested_at: nowISO() }
      await idbAddToQueue({ type:'ambulanceRequest', payload })
      setQueue(await idbGetQueue())
      setLog(l=>['Ambulance queued with GPS',...l].slice(0,80))
      if (navigator.onLine) trySync()
    }, err => {
      setLog(l=>[`GPS error: ${err.message}`,...l].slice(0,80))
      idbAddToQueue({ type:'ambulanceRequest', payload:{ id: uid(), profileId: profile.id, requested_at: nowISO() } })
    }, { timeout: 10000 })
  }

  async function trySync() {
    if (!navigator.onLine) return setLog(l=>['Still offline',...l].slice(0,80))
    const q = await idbGetQueue()
    if (!q.length) return setLog(l=>['Nothing to sync',...l].slice(0,80))
    setLog(l=>[`Syncing ${q.length} items...`,...l].slice(0,80))
    for (const op of q) {
      try { await sendOp(op) } catch (e) { setLog(l=>[`Sync failed ${op.type}`,...l].slice(0,80)); return }
    }
    await idbClearQueue(); setQueue([]); setLog(l=>['Sync complete',...l].slice(0,80))
  }

  useEffect(()=>{ (async ()=> {
    try {
      const { data } = await supabase.from('health_tips').select('*').order('created_at',{ascending:false}).limit(10)
    } catch(e) {}
  })() }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <Header online={online} setLang={setLang} />
        <OfflineBanner online={online}/>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DashboardCard title={t('app.title')} desc={t('app.subtitle')} icon="🩺" action={()=>document.getElementById('consult')?.scrollIntoView({behavior:'smooth'})}/>
              <DashboardCard title={t('requestAmbulance')} desc="One-tap ambulance" icon="🚑" action={()=>{ if(!selected) return alert(t('selectPatient')); requestAmbulance(selected) }}/>
              <DashboardCard title={t('order')} desc="Order medicines" icon="💊" action={()=>placeOrder('Paracetamol 500mg')}/>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-3">Consult / Triage</h2>
              <div id="consult" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="p-4 border rounded-lg">
                    {selected ? <><div className="font-semibold">{selected.name}</div><div className="text-sm text-gray-500">{selected.phone} • {selected.village}</div></> : <div className="text-gray-500">{t('selectPatient')}</div>}
                  </div>
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">{t('symptoms')}</h4>
                    <textarea value={symptoms} onChange={e=>setSymptoms(e.target.value)} className="w-full p-3 border rounded-lg" rows={4}/>
                    <div className="mt-3 flex gap-2"><button onClick={addAppointment} className="bg-vhaGreen text-white px-4 py-2 rounded-lg">{t('submit')}</button></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recent Appointments</h4>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {appointments.length===0 && <div className="text-gray-500">No appointments</div>}
                    {appointments.map(a => <div key={a.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between"><div className="text-sm">{a.symptoms?.join(', ')}</div><div className="text-xs px-2 py-1 rounded-full bg-gray-100">{a.triage?.level}</div></div>
                      <div className="text-xs text-gray-400 mt-2">{a.created_at}</div>
                    </div>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold mb-3">Activity / Logs</h3>
              <div className="text-sm text-gray-600 max-h-36 overflow-auto">{log.map((l,i)=><div key={i} className="py-1 border-b last:border-b-0">{l}</div>)}</div>
            </div>

          </div>

          <aside className="space-y-6">
            <div className="card p-4">
              <h3 className="font-semibold mb-3">{t('addPatient')}</h3>
              <PatientForm form={pForm} setForm={setPForm} onSave={createProfile}/>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-3">{t('patients')}</h3>
              <PatientList profiles={profiles} onSelect={p=>setSelected(p)} selectedId={selected?.id}/>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold mb-3">{t('syncQueue')}</h3>
              <div className="text-sm text-gray-600">
                {queue.length===0 ? <div>No queued items</div> : <ol className="list-decimal list-inside space-y-1">{queue.map((q,i)=><li key={i} className="text-xs">{q.type} • {q.payload?.id}</li>)}</ol>}
                <div className="mt-3"><button onClick={trySync} className="w-full py-2 bg-vhaBlue text-white rounded-lg">{t('forceSync')}</button></div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
