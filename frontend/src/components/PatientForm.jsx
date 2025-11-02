import React from 'react'
import { useTranslation } from 'react-i18next'
export default function PatientForm({ form, setForm, onSave }) {
  const { t } = useTranslation()
  return (
    <form onSubmit={onSave} className="space-y-3">
      <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder={t('addPatient')} className="w-full p-3 border rounded-lg" required/>
      <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="Phone" className="w-full p-3 border rounded-lg" required/>
      <input value={form.village} onChange={e=>setForm({...form, village:e.target.value})} placeholder="Village" className="w-full p-3 border rounded-lg"/>
      <button className="w-full py-2 bg-vhaBlue text-white rounded-lg">{t('addPatient')}</button>
    </form>
  )
}
