import React from 'react'
import { useTranslation } from 'react-i18next'
export default function Header({ online, setLang }) {
  const { t } = useTranslation()
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-vhaGreen text-white rounded-xl flex items-center justify-center font-bold">V</div>
        <div>
          <h1 className="text-2xl font-semibold">{t('app.title')}</h1>
          <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <div className={`px-3 py-1 rounded-full text-sm ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>{online ? t('online') : t('offline')}</div>
        <select onChange={e=>setLang(e.target.value)} defaultValue="en" className="border rounded-md p-1">
          <option value="en">English</option>
          <option value="kn">ಕನ್ನಡ</option>
        </select>
      </div>
    </header>
  )
}
