import React from 'react'
import { useTranslation } from 'react-i18next'
export default function OfflineBanner({ online }) {
  const { t } = useTranslation()
  if (online) return null
  return (
    <div className="mb-4 p-3 rounded-md bg-yellow-50 border-l-4 border-yellow-400">
      <strong>{t('offline')}</strong>
      <div className="text-sm text-gray-600">Changes are saved locally and will sync when online.</div>
    </div>
  )
}
