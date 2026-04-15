'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const STOP_REASONS = ['기상 악화 (폭우·태풍·강설)', '풍속 10m/s 이상', '지진·재난', '설계 변경', '안전사고 발생', '안전 위반 적발', '민원·분쟁', '발주처 요청', '기타']

export default function WorkStopPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [records, setRecords] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    stop_date: selectedDate,
    stop_time: '',
    resume_date: '',
    resume_time: '',
    reason: STOP_REASONS[0],
    location: '',
    ordered_by: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadRecords() }, [selectedSite])

  async function loadRecords() {
    if (!selectedSite) return
    const { data } = await supabase.from('safety_issues')
      .select('*')
      .eq('site_id', selectedSite.id)
      .eq('issue_type', '작업중지')
      .order('created_at', { ascending: false })
    setRecords(data ?? [])
  }

  async function saveRecord() {
    if (!selectedSite) return
    setSaving(true)
    const { data } = await supabase.from('safety_issues').insert({
      site_id: selectedSite.id,
      issue_type: '작업중지',
      issue_date: form.stop_date,
      location: form.location,
      description: JSON.stringify(form),
      status: form.resume_date ? '완료' : '처리중',
      assigned_to: form.ordered_by,
    }).select().single()
    if (data) { setRecords(prev => [data, ...prev]); setShowForm(false); showToast('✅ 작업중지 기록 저장', 'ok') }
    setSaving(false)
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>작업중지 기록</span>
        <span className="tag ty">법정 기록</span>
      </div>

      <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--br)' }}>📋 작업중지 기록</strong>은 산업안전보건법 제52조에 따른 의무 기록입니다. 작업 중지 사유, 기간, 재개 시점을 정확히 기록하세요.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>기록 목록 ({records.length}건)</div>
        <button className="btn btn-main btn-sm" onClick={() => setShowForm(o => !o)}>+ 작업중지 기록</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '10px' }}>
          <div className="card-t">작업중지 기록</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>중지일</label>
              <input className="fi" type="date" value={form.stop_date} onChange={e => setForm(f => ({ ...f, stop_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>중지 시각</label>
              <input className="fi" type="time" value={form.stop_time} onChange={e => setForm(f => ({ ...f, stop_time: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>재개일</label>
              <input className="fi" type="date" value={form.resume_date} onChange={e => setForm(f => ({ ...f, resume_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>재개 시각</label>
              <input className="fi" type="time" value={form.resume_time} onChange={e => setForm(f => ({ ...f, resume_time: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>중지 사유</label>
            <select className="fi" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
              {STOP_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>중지 구역</label>
              <input className="fi" placeholder="전 현장 / 3층 구역" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>지시자</label>
              <input className="fi" placeholder="현장소장 홍길동" value={form.ordered_by} onChange={e => setForm(f => ({ ...f, ordered_by: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>상세 내용</label>
            <textarea className="fta" rows={3} placeholder="중지 상세 사유 및 조치 내용을 기록하세요..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-main" onClick={saveRecord} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '40px' }}>
          <div className="ei">▶️</div>
          <div style={{ fontWeight: 700 }}>작업중지 기록 없음</div>
          <div style={{ marginTop: '4px', color: 'var(--grn)' }}>정상 작업 중입니다</div>
        </div>
      ) : (
        records.map((r, i) => {
          let parsed: any = {}
          try { parsed = JSON.parse(r.description) } catch {}
          return (
            <div key={i} className="card" style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>⛔ {parsed.reason ?? '작업중지'}</span>
                <span style={{ background: r.status === '완료' ? '#DCFCE7' : '#FEF9C3', color: r.status === '완료' ? 'var(--grn)' : 'var(--gd)', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>{r.status}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--tx3)', display: 'flex', gap: '12px' }}>
                <span>⏸ {parsed.stop_date} {parsed.stop_time}</span>
                {parsed.resume_date && <span>▶ {parsed.resume_date} {parsed.resume_time}</span>}
              </div>
              {r.location && <div style={{ fontSize: '11px', color: 'var(--tx3)', marginTop: '3px' }}>📍 {r.location}</div>}
            </div>
          )
        })
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
