'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const ACCIDENT_TYPES = ['사망사고', '중상해', '경상해', '아차사고', '화재', '붕괴', '낙하·비래', '기타']
const BODY_PARTS = ['머리/목', '눈', '팔/손', '다리/발', '몸통', '전신', '해당없음']

export default function AccidentPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [reports, setReports] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    acc_date: selectedDate,
    acc_time: '',
    acc_type: ACCIDENT_TYPES[2],
    location: '',
    victim_name: '',
    victim_age: '',
    body_part: BODY_PARTS[6],
    description: '',
    cause: '',
    action_taken: '',
    witness: '',
    report_to_labor: false,
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadReports() }, [selectedSite])

  async function loadReports() {
    if (!selectedSite) return
    const { data } = await supabase.from('safety_issues')
      .select('*')
      .eq('site_id', selectedSite.id)
      .in('issue_type', ACCIDENT_TYPES)
      .order('created_at', { ascending: false })
    setReports(data ?? [])
  }

  async function saveReport() {
    if (!selectedSite || !form.description) { showToast('사고 내용을 입력하세요', 'warn'); return }
    setSaving(true)
    const { data } = await supabase.from('safety_issues').insert({
      site_id: selectedSite.id,
      issue_type: form.acc_type,
      issue_date: form.acc_date,
      location: form.location,
      description: JSON.stringify(form),
      status: '처리중',
      assigned_to: form.victim_name,
    }).select().single()
    if (data) { setReports(prev => [data, ...prev]); setShowForm(false); showToast('✅ 사고 보고서 저장 완료', 'ok') }
    setSaving(false)
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const severeTypes = ['사망사고', '중상해']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>사고 즉시 보고서</span>
        <span className="tag tr">법정 서류</span>
      </div>

      {/* 비상 연락 */}
      <div style={{ background: 'var(--red)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {[
          { icon: '🚑', label: '119 구급', tel: '119' },
          { icon: '👮', label: '경찰', tel: '112' },
          { icon: '⚠️', label: '고용노동부', tel: '1350' },
        ].map(c => (
          <a key={c.tel} href={`tel:${c.tel}`} style={{ textDecoration: 'none', background: 'rgba(255,255,255,.15)', borderRadius: '8px', padding: '8px', textAlign: 'center', display: 'block' }}>
            <div style={{ fontSize: '18px', marginBottom: '2px' }}>{c.icon}</div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>{c.label}</div>
            <div style={{ fontSize: '13px', color: '#fff', fontFamily: 'Bebas Neue, sans-serif' }}>{c.tel}</div>
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>보고서 목록 ({reports.length}건)</div>
        <button className="btn btn-red btn-sm" onClick={() => setShowForm(o => !o)}>+ 사고 보고서 작성</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '10px', border: '1.5px solid rgba(230,59,46,.3)' }}>
          <div className="card-t" style={{ color: 'var(--red)' }}>🚨 사고 즉시 보고서</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발생일</label>
              <input className="fi" type="date" value={form.acc_date} onChange={e => setForm(f => ({ ...f, acc_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발생시각</label>
              <input className="fi" type="time" value={form.acc_time} onChange={e => setForm(f => ({ ...f, acc_time: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>사고 유형</label>
              <select className="fi" value={form.acc_type} onChange={e => setForm(f => ({ ...f, acc_type: e.target.value }))}>
                {ACCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발생 장소</label>
              <input className="fi" placeholder="3층 거푸집 구역" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>피해자 성명</label>
              <input className="fi" placeholder="홍길동" value={form.victim_name} onChange={e => setForm(f => ({ ...f, victim_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>부상 부위</label>
              <select className="fi" value={form.body_part} onChange={e => setForm(f => ({ ...f, body_part: e.target.value }))}>
                {BODY_PARTS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>사고 경위</label>
            <textarea className="fta" rows={3} placeholder="사고 발생 전 작업 내용, 경위를 상세히 기술하세요..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>추정 원인</label>
            <input className="fi" placeholder="비계 발판 불량으로 인한 미끄러짐" value={form.cause} onChange={e => setForm(f => ({ ...f, cause: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>초기 조치 사항</label>
            <textarea className="fta" rows={2} placeholder="응급처치, 119 신고, 작업중지 등" value={form.action_taken} onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.report_to_labor} onChange={e => setForm(f => ({ ...f, report_to_labor: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>고용노동부 보고 완료</span>
            </label>
          </div>
          {severeTypes.includes(form.acc_type) && (
            <div style={{ background: '#FFE4E1', border: '1.5px solid rgba(230,59,46,.3)', borderRadius: '8px', padding: '10px', marginBottom: '10px', fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>
              ⚠️ {form.acc_type}은 발생 즉시 고용노동부에 신고 의무가 있습니다 (중대재해처벌법)
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-red" onClick={saveReport} disabled={saving}>{saving ? '저장 중...' : '📋 보고서 저장'}</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '40px' }}>
          <div className="ei">✅</div>
          <div style={{ fontWeight: 700 }}>사고 보고서가 없습니다</div>
          <div style={{ color: 'var(--grn)', marginTop: '4px' }}>안전한 현장입니다!</div>
        </div>
      ) : (
        reports.map((r, i) => {
          const isSerious = severeTypes.includes(r.issue_type)
          return (
            <div key={i} className="card" style={{ marginBottom: '8px', border: isSerious ? '1.5px solid rgba(230,59,46,.4)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: isSerious ? 'var(--red)' : 'var(--tx)' }}>
                  {isSerious ? '🚨 ' : ''}{r.issue_type}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--tx3)' }}>{r.issue_date}</span>
              </div>
              {r.location && <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '4px' }}>📍 {r.location}</div>}
              {r.assigned_to && <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>👤 {r.assigned_to}</div>}
            </div>
          )
        })
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
