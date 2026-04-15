'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function EquipmentPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [equipments, setEquipments] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', spec: '', qty: 1, hours: 8, unit_price: 0 })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadData() }, [selectedSite, selectedDate])

  async function loadData() {
    if (!selectedSite) return
    // Get log for today
    const { data: log } = await supabase.from('daily_logs').select('id').eq('site_id', selectedSite.id).eq('log_date', selectedDate).single()
    if (log) {
      const { data } = await supabase.from('equipment_usage').select('*').eq('log_id', log.id)
      setEquipments(data ?? [])
    }
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const total = equipments.reduce((s, e) => s + e.qty * e.hours * e.unit_price, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>장비 관리</div>
        <span style={{ fontSize: '11px', color: 'var(--tx3)' }}>공사일보 &gt; 장비 탭에서 입력하세요</span>
      </div>
      {equipments.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">🏗️</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>오늘 장비 투입 기록 없음</div>
          <div>공사일보 탭에서 장비를 입력하세요</div>
        </div>
      ) : (
        <div className="card">
          <div className="card-t">오늘 투입 장비</div>
          <table className="tbl">
            <thead><tr><th>장비명</th><th>규격</th><th>대수</th><th>시간</th><th>금액</th></tr></thead>
            <tbody>
              {equipments.map((e, i) => (
                <tr key={i}>
                  <td>{e.name}</td>
                  <td>{e.spec}</td>
                  <td>{e.qty}대</td>
                  <td>{e.hours}h</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--gd)' }}>₩{(e.qty * e.hours * e.unit_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, padding: '8px 0 0', borderTop: '1px solid var(--g1)', marginTop: '8px' }}>
            <span>장비비 합계</span>
            <span style={{ color: 'var(--gd)', fontFamily: 'monospace' }}>₩{total.toLocaleString()}</span>
          </div>
        </div>
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
