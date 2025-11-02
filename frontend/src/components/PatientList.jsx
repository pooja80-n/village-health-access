import React from 'react'
import { useTranslation } from 'react-i18next'
export default function PatientList({ profiles, onSelect, selectedId }) {
  const { t } = useTranslation()
  if (!profiles || profiles.length===0) return <div className="text-gray-500">{t('noPatients')}</div>
  return (
    <div className="space-y-2">
      {profiles.map(p => (
        <div key={p.id} className={`p-3 rounded-lg border flex items-center justify-between ${selectedId===p.id ? 'ring-2 ring-vhaGreen':''}`}>
          <div>
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-500">{p.phone} • {p.village}</div>
          </div>
          <button onClick={()=>onSelect(p)} className="py-1 px-3 bg-vhaGreen text-white rounded-lg">Select</button>
        </div>
      ))}
    </div>
  )
}
