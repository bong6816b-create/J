'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const SAFETY_ITEMS = [
  { id: 'risk_assess', label: '위험성 평가서', required: true },
  { id: 'tbm_record', label: 'TBM 안전교육 기록', required: true },
  { id: 'safety_meeting', label: '안전보건회의 결과', required: true },
  { id: 'accident_report', label: '사고 즉시 보고서', required: false },
  { id: 'work_stop', label: '작업중지 기록', required: false },
  { id: 'safety_training', label: '안전교육 이수 현황', required: true },
  { id: 'equipment_inspect', label: '장비 점검일지', required: true },
  { id: 'safety_cost', label: '산업안전보건관리비 사용내역', required: true },
]

export default function SafetyLedgerPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [records, setRecords] = useState<Record<string, { status: string; note: string; date: string }>>({})
  const [editItem, setEditItem] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadRecords() }, [selectedSite])

  async function loadRecords() {
    if (!selectedSite) return
    // Use safety_issues as general ledger entries
    const { data } = await supabase
      .from('safety_issues')
      .select('*')
      .eq('site_id', selectedSite.id)
      .eq('issue_type', 'ledger')
    const rec: typeof records = {}
    ;(data ?? []).forEach((d: any) => { rec[d.location] = { status: d.status, note: d.description ?? '', date: d.issue_date ?? '' } })
    setRecords(rec)
  }

  async function saveRecord(id: string, status: string) {
    if (!selectedSite) return
    const existing = records[id]
    const note = id === editItem ? editNote : (existing?.note ?? '')
    // Upsert via safety_issues with type 'ledger' and location = item id
    const { data: existing_rec } = await supabase
      .from('safety_issues')
      .select('id')
      .eq('site_id', selectedSite.id)
      .eq('issue_type', 'ledger')
      .eq('location', id)
      .single()

    if (existing_rec) {
      await supabase.from('safety_issues').update({ status, description: note, issue_date: selectedDate }).eq('id', existing_rec.id)
    } else {
      await supabase.from('safety_issues').insert({ site_id: selectedSite.id, issue_type: 'ledger', location: id, status, description: note, issue_date: selectedDate })
    }
    setRecords(prev => ({ ...prev, [id]: { status, note, date: selectedDate } }))
    setEditItem(null)
    showToast('✅ 저장됨', 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const doneCount = SAFETY_ITEMS.filter(item => records[item.id]?.status === '완료').length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>안전보건대장</span>
        <span className="tag tr">중대재해처벌법</span>
      </div>

      <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--br)' }}>⚖️ 안전보건대장</strong>은 중대재해처벌법에 따른 필수 관리 서류입니다. 각 항목의 이행 상태를 기록·관리하세요.
      </div>

      {/* 진행 현황 */}
      <div className="card" style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>이행 현황</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--grn)' }}>{doneCount} / {SAFETY_ITEMS.length}건</span>
        </div>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: `${(doneCount / SAFETY_ITEMS.length) * 100}%`, background: doneCount === SAFETY_ITEMS.length ? 'var(--grn)' : 'linear-gradient(90deg, var(--teal), var(--teal2))' }} />
        </div>
      </div>

      {/* 항목별 체크 */}
      <div className="card">
        {SAFETY_ITEMS.map((item, i) => {
          const rec = records[item.id]
          const isDone = rec?.status === '완료'
          const isEditing = editItem === item.id
          return (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: i < SAFETY_ITEMS.length - 1 ? '1px solid var(--g1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isEditing ? '8px' : 0 }}>
                <div
                  onClick={() => saveRecord(item.id, isDone ? '미이행' : '완료')}
                  style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${isDone ? 'var(--grn)' : 'var(--g2)'}`, background: isDone ? 'var(--grn)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all .2s' }}>
                  {isDone && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isDone ? 'var(--grn)' : 'var(--tx)' }}>
                    {item.label}
                    {item.required && <span style={{ marginLeft: '4px', fontSize: '9px', color: 'var(--red)', fontWeight: 700 }}>필수</span>}
                  </div>
                  {rec?.date && <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>{rec.date} 이행</div>}
                  {rec?.note && !isEditing && <div style={{ fontSize: '10px', color: 'var(--tx3)', marginTop: '2px' }}>{rec.note}</div>}
                </div>
                <button
                  onClick={() => { setEditItem(isEditing ? null : item.id); setEditNote(rec?.note ?? '') }}
                  style={{ background: 'none', border: '1px solid var(--cream3)', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', color: 'var(--tx3)', fontFamily: 'var(--sans)' }}>
                  {isEditing ? '닫기' : '메모'}
                </button>
              </div>
              {isEditing && (
                <div style={{ paddingLeft: '30px' }}>
                  <textarea className="fta" rows={2} placeholder="이행 내용, 담당자, 특이사항..."
                    value={editNote} onChange={e => setEditNote(e.target.value)}
                    style={{ minHeight: '50px', fontSize: '12px' }} />
                  <button className="btn btn-teal btn-sm" onClick={() => saveRecord(item.id, rec?.status ?? '미이행')} style={{ marginTop: '4px' }}>저장</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Toast message={toast} type={toastType} />
    </div>
  )
}
