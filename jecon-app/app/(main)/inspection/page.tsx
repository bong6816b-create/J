'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const EQUIP_LIST = ['타워크레인', '이동식크레인', '굴삭기', '덤프트럭', '콘크리트펌프카', '지게차', '고소작업차', '발전기', '컴프레서', '전동공구']
const CHECK_ITEMS = [
  { id: 'oil', label: '오일·냉각수 점검' },
  { id: 'brake', label: '브레이크·조향 점검' },
  { id: 'wire', label: '와이어로프·체인 점검' },
  { id: 'safety', label: '안전장치 작동 확인' },
  { id: 'leak', label: '누유·누수 확인' },
  { id: 'light', label: '경보·조명 작동' },
  { id: 'tire', label: '타이어·무한궤도 상태' },
  { id: 'body', label: '차체·구조물 이상 유무' },
]

export default function InspectionPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [equipName, setEquipName] = useState(EQUIP_LIST[0])
  const [customEquip, setCustomEquip] = useState('')
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [issues, setIssues] = useState('')
  const [inspector, setInspector] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadLogs() }, [selectedSite, selectedDate])

  async function loadLogs() {
    if (!selectedSite) return
    const { data } = await supabase.from('equipment_usage').select('*')
      .eq('log_id', 'inspection')  // We'll store using notes field differently
    // Actually use stock_records with name prefix 'inspection:'
    const { data: recs } = await supabase.from('stock_records').select('*')
      .eq('site_id', selectedSite.id)
      .like('name', '장비점검:%')
      .order('record_date', { ascending: false })
    setLogs(recs ?? [])
  }

  async function saveInspection() {
    if (!selectedSite) return
    setSaving(true)
    const name = customEquip || equipName
    const passCount = Object.values(checks).filter(Boolean).length
    const content = JSON.stringify({ checks, issues, inspector, date: selectedDate })
    const { data } = await supabase.from('stock_records').insert({
      site_id: selectedSite.id,
      record_date: selectedDate,
      name: `장비점검:${name}`,
      record_type: 'in',
      qty: 1,
      unit: '회',
      unit_price: 0,
      note: `점검자:${inspector} | 이상항목:${issues || '없음'} | 통과:${passCount}/${CHECK_ITEMS.length}`,
    }).select().single()
    if (data) { setLogs(prev => [data, ...prev]); setShowForm(false); setChecks({}); setIssues(''); showToast('✅ 장비 점검 기록 저장!', 'ok') }
    setSaving(false)
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const allPassed = CHECK_ITEMS.every(item => checks[item.id])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>장비 점검일지</span>
        <span className="tag ty">산업안전보건법</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>점검 기록 ({logs.length}건)</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowForm(o => !o)}>+ 점검 기록</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '10px' }}>
          <div className="card-t">장비 점검 기록 — {selectedDate}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>장비 선택</label>
              <select className="fi" value={equipName} onChange={e => setEquipName(e.target.value)}>
                {EQUIP_LIST.map(e => <option key={e}>{e}</option>)}
                <option value="">직접입력</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>{equipName ? '장비명' : '직접 입력'}</label>
              <input className="fi" placeholder={equipName || '장비명 입력'} value={customEquip} onChange={e => setCustomEquip(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '6px' }}>점검 항목</label>
            <div style={{ background: 'var(--g1)', borderRadius: '10px', padding: '4px' }}>
              {CHECK_ITEMS.map(item => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid rgba(44,24,16,.05)' }}>
                  <div onClick={() => setChecks(c => ({ ...c, [item.id]: !c[item.id] }))}
                    style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${checks[item.id] ? 'var(--grn)' : 'var(--g2)'}`, background: checks[item.id] ? 'var(--grn)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all .15s' }}>
                    {checks[item.id] && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--tx2)' }}>{item.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: checks[item.id] ? 'var(--grn)' : 'var(--g3)' }}>
                    {checks[item.id] ? '이상없음' : '미점검'}
                  </span>
                </label>
              ))}
            </div>
            {allPassed && (
              <div style={{ background: '#DCFCE7', borderRadius: '8px', padding: '8px 10px', marginTop: '6px', fontSize: '11px', color: 'var(--grn)', fontWeight: 700, textAlign: 'center' }}>
                ✅ 전 항목 이상 없음
              </div>
            )}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>이상 사항</label>
            <textarea className="fta" rows={2} placeholder="이상 없으면 비워두세요" value={issues} onChange={e => setIssues(e.target.value)} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>점검자</label>
            <input className="fi" placeholder="홍길동" value={inspector} onChange={e => setInspector(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-main" onClick={saveInspection} disabled={saving}>{saving ? '저장 중...' : '💾 저장'}</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '40px' }}>
          <div className="ei">🏗️</div>
          <div style={{ fontWeight: 700 }}>장비 점검 기록이 없습니다</div>
        </div>
      ) : (
        logs.map((l, i) => {
          const noteStr = l.note ?? ''
          const hasIssue = noteStr.includes('이상항목:') && !noteStr.includes('이상항목:없음')
          return (
            <div key={i} className="card" style={{ marginBottom: '8px', borderColor: hasIssue ? 'rgba(230,59,46,.3)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{l.name.replace('장비점검:', '')}</span>
                <span style={{ background: hasIssue ? '#FFE4E1' : '#DCFCE7', color: hasIssue ? 'var(--red)' : 'var(--grn)', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px' }}>
                  {hasIssue ? '이상 있음' : '이상 없음'}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>{l.record_date} · {noteStr.split('|')[0]?.trim()}</div>
            </div>
          )
        })
      )}
      <Toast message={toast} type={toastType} />
    </div>
  )
}
