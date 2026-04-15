'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import type { Site } from '@/types'
import Toast from '@/components/Toast'

export default function SitesPage() {
  const { company } = useApp()
  const supabase = createClient()
  const [sites, setSites] = useState<Site[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', client: '', address: '', start_date: '', end_date: '', contract_amount: 0 })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => {
    loadSites()
  }, [company])

  async function loadSites() {
    if (!company) return
    const { data } = await supabase.from('sites').select('*').eq('company_id', company.id).order('created_at', { ascending: false })
    setSites(data ?? [])
  }

  async function addSite() {
    if (!company || !form.name) { showToast('현장명을 입력하세요', 'warn'); return }
    const { data } = await supabase.from('sites').insert({
      ...form,
      company_id: company.id,
      status: 'active',
    }).select().single()
    if (data) {
      setSites(prev => [data, ...prev])
      setForm({ name: '', client: '', address: '', start_date: '', end_date: '', contract_amount: 0 })
      setShowForm(false)
      showToast('✅ 현장 등록 완료!', 'ok')
    }
  }

  async function toggleStatus(site: Site) {
    const newStatus = site.status === 'active' ? 'completed' : 'active'
    await supabase.from('sites').update({ status: newStatus }).eq('id', site.id)
    setSites(prev => prev.map(s => s.id === site.id ? { ...s, status: newStatus } : s))
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 2500)
  }

  const statusTag = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: '#DCFCE7', color: 'var(--grn)', label: '진행중' },
      completed: { bg: '#F1F5F9', color: 'var(--g3)', label: '완료' },
      paused: { bg: '#FEF9C3', color: 'var(--gd)', label: '중단' },
    }
    const m = map[s] ?? map.active
    return <span style={{ background: m.bg, color: m.color, fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>{m.label}</span>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>현장 관리</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowForm(o => !o)}>+ 현장 등록</button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-t">새 현장 등록</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>현장명 *</label>
            <input className="fi" placeholder="○○아파트 신축공사" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발주처</label>
              <input className="fi" placeholder="(주)○○건설" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>계약금액 (원)</label>
              <input className="fi" type="number" value={form.contract_amount || ''} onChange={e => setForm(f => ({ ...f, contract_amount: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>현장 주소</label>
            <input className="fi" placeholder="서울시 강남구 ..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>공사 시작일</label>
              <input className="fi" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>공사 완료일</label>
              <input className="fi" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-gold" onClick={addSite}>✅ 등록</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">🏗️</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>등록된 현장이 없습니다</div>
          <button className="btn btn-gold btn-sm" onClick={() => setShowForm(true)}>+ 첫 현장 등록</button>
        </div>
      ) : (
        sites.map(site => (
          <div key={site.id} className="card" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>{site.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>{site.client ?? '발주처 미입력'}</div>
              </div>
              {statusTag(site.status)}
            </div>
            {site.address && <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '6px' }}>📍 {site.address}</div>}
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--tx3)', marginBottom: '8px' }}>
              {site.start_date && <span>▶ {site.start_date}</span>}
              {site.end_date && <span>⏹ {site.end_date}</span>}
              {site.contract_amount > 0 && <span>💰 ₩{(site.contract_amount / 10000).toFixed(0)}만원</span>}
            </div>
            <button onClick={() => toggleStatus(site)}
              style={{ background: 'none', border: '1px solid var(--cream3)', borderRadius: '7px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer', color: 'var(--tx3)', fontFamily: 'var(--sans)' }}>
              {site.status === 'active' ? '완료 처리' : '재개'}
            </button>
          </div>
        ))
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
