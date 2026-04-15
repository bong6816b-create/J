'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function MaterialsPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [records, setRecords] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', record_type: 'in' as 'in' | 'out', qty: 0, unit: '', unit_price: 0, note: '' })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadData() }, [selectedSite])

  async function loadData() {
    if (!selectedSite) return
    const { data } = await supabase.from('stock_records').select('*').eq('site_id', selectedSite.id).order('record_date', { ascending: false })
    setRecords(data ?? [])
  }

  async function addRecord() {
    if (!selectedSite || !form.name) { showToast('자재명을 입력하세요', 'warn'); return }
    const { data } = await supabase.from('stock_records').insert({ ...form, site_id: selectedSite.id, record_date: selectedDate }).select().single()
    if (data) { setRecords(prev => [data, ...prev]); setShowForm(false); showToast('자재 수불 등록 완료', 'ok') }
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>자재 수불부</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowForm(o => !o)}>+ 수불 등록</button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-t">자재 수불 등록</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>자재명</label>
              <input className="fi" placeholder="레미콘" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>구분</label>
              <select className="fi" value={form.record_type} onChange={e => setForm(f => ({ ...f, record_type: e.target.value as 'in' | 'out' }))}>
                <option value="in">입고</option>
                <option value="out">출고</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>수량</label>
              <input className="fi" type="number" value={form.qty || ''} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>단위</label>
              <input className="fi" placeholder="m³" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>단가</label>
              <input className="fi" type="number" value={form.unit_price || ''} onChange={e => setForm(f => ({ ...f, unit_price: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>비고</label>
            <input className="fi" placeholder="메모" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-gold" onClick={addRecord}>등록</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">🧱</div>
          <div style={{ fontWeight: 700 }}>자재 수불 기록이 없습니다</div>
        </div>
      ) : (
        <div className="card">
          <div className="card-t">수불 기록</div>
          <table className="tbl">
            <thead><tr><th>날짜</th><th>자재명</th><th>구분</th><th>수량</th><th>금액</th></tr></thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontSize: '10px' }}>{r.record_date}</td>
                  <td style={{ fontWeight: 700 }}>{r.name}</td>
                  <td><span style={{ background: r.record_type === 'in' ? '#DCFCE7' : '#FFE4E1', color: r.record_type === 'in' ? 'var(--grn)' : 'var(--red)', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '12px' }}>{r.record_type === 'in' ? '입고' : '출고'}</span></td>
                  <td>{r.qty}{r.unit}</td>
                  <td style={{ fontFamily: 'monospace' }}>₩{(r.qty * r.unit_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
