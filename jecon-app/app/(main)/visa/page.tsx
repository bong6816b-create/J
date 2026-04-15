'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import type { Worker } from '@/types'
import { differenceInDays, parseISO } from 'date-fns'
import Toast from '@/components/Toast'

const VISA_TYPES = ['E-9 (비전문취업)', 'E-7 (특정활동)', 'H-2 (방문취업)', 'F-4 (재외동포)', 'F-5 (영주)', 'F-6 (결혼이민)', '기타']

export default function VisaPage() {
  const { company } = useApp()
  const supabase = createClient()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [editWorker, setEditWorker] = useState<Worker | null>(null)
  const [visaForm, setVisaForm] = useState({ visa_type: VISA_TYPES[0], visa_expire: '', visa_regnum: '' })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { loadWorkers() }, [company])

  async function loadWorkers() {
    if (!company) return
    const { data } = await supabase.from('workers').select('*').eq('company_id', company.id).order('name')
    setWorkers((data ?? []) as Worker[])
  }

  async function saveVisa() {
    if (!editWorker) return
    await supabase.from('workers').update(visaForm).eq('id', editWorker.id)
    setWorkers(prev => prev.map(w => w.id === editWorker.id ? { ...w, ...visaForm } : w))
    setEditWorker(null)
    showToast('✅ 비자 정보 저장 완료', 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  function getDaysLeft(expire: string | undefined): number | null {
    if (!expire) return null
    try { return differenceInDays(parseISO(expire), new Date()) } catch { return null }
  }

  function getExpireColor(days: number | null) {
    if (days === null) return 'var(--g3)'
    if (days < 0) return 'var(--red)'
    if (days <= 30) return 'var(--red)'
    if (days <= 90) return '#F59E0B'
    return 'var(--grn)'
  }

  function getExpireLabel(days: number | null) {
    if (days === null) return '미입력'
    if (days < 0) return `만료 ${Math.abs(days)}일 경과`
    if (days === 0) return '오늘 만료!'
    return `D-${days}`
  }

  const foreignWorkers = workers.filter(w => w.nationality !== 'ko')
  const urgentCount = foreignWorkers.filter(w => {
    const days = getDaysLeft(w.visa_expire)
    return days !== null && days <= 90
  }).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>외국인 비자 만료 알림</span>
        {urgentCount > 0 && (
          <span style={{ background: 'var(--red)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
            ⚠️ {urgentCount}명 주의
          </span>
        )}
      </div>

      {urgentCount > 0 && (
        <div style={{ background: '#FFE4E1', border: '1.5px solid rgba(230,59,46,.3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--red)', lineHeight: 1.55 }}>
          <strong>⚠️ {urgentCount}명의 비자가 90일 이내 만료 예정입니다.</strong> 즉시 갱신 절차를 시작하세요.
        </div>
      )}

      {foreignWorkers.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '60px' }}>
          <div className="ei">🌍</div>
          <div style={{ fontWeight: 700 }}>등록된 외국인 근로자가 없습니다</div>
        </div>
      ) : (
        foreignWorkers.map(w => {
          const days = getDaysLeft(w.visa_expire)
          const color = getExpireColor(days)
          const label = getExpireLabel(days)
          const NATIONALITIES: Record<string, string> = { vi: '🇻🇳', zh: '🇨🇳', ne: '🇳🇵', mn: '🇲🇳', kh: '🇰🇭' }
          return (
            <div key={w.id} className="card" style={{ marginBottom: '8px', borderColor: days !== null && days <= 30 ? 'rgba(230,59,46,.3)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {NATIONALITIES[w.nationality] ?? '🌍'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{w.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--tx3)' }}>{w.role}</div>
                  {w.visa_type && <div style={{ fontSize: '10px', color: 'var(--tx3)', marginTop: '2px' }}>{w.visa_type}</div>}
                  {w.visa_expire && <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>만료일: {w.visa_expire}</div>}
                  {w.visa_regnum && <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>등록번호: {w.visa_regnum}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color, lineHeight: 1 }}>{label}</div>
                  <button
                    onClick={() => { setEditWorker(w); setVisaForm({ visa_type: w.visa_type ?? VISA_TYPES[0], visa_expire: w.visa_expire ?? '', visa_regnum: w.visa_regnum ?? '' }) }}
                    style={{ marginTop: '4px', background: 'var(--g1)', border: '1px solid var(--cream3)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', color: 'var(--tx3)', fontFamily: 'var(--sans)' }}>
                    수정
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* 비자 수정 모달 */}
      {editWorker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 90, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--white)', borderRadius: '22px 22px 0 0', padding: '20px 16px 40px', width: '100%', maxWidth: '480px' }}>
            <div style={{ width: '36px', height: '4px', background: 'var(--g2)', borderRadius: '2px', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>비자 정보 수정 — {editWorker.name}</div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>비자 종류</label>
              <select className="fi" value={visaForm.visa_type} onChange={e => setVisaForm(f => ({ ...f, visa_type: e.target.value }))}>
                {VISA_TYPES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>만료일</label>
                <input className="fi" type="date" value={visaForm.visa_expire} onChange={e => setVisaForm(f => ({ ...f, visa_expire: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>외국인 등록번호</label>
                <input className="fi" placeholder="000000-0000000" value={visaForm.visa_regnum} onChange={e => setVisaForm(f => ({ ...f, visa_regnum: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button className="btn btn-main" onClick={saveVisa}>저장</button>
              <button className="btn btn-ghost" onClick={() => setEditWorker(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
