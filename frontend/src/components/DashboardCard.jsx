import React from 'react'
export default function DashboardCard({ title, desc, icon, action }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow-md flex flex-col justify-between">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{desc}</p>
        </div>
      </div>
      <div className="mt-4">
        <button onClick={action} className="w-full text-sm py-2 bg-vhaGreen text-white rounded-xl">Open</button>
      </div>
    </div>
  )
}
