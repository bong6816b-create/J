'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { RISK_DB, WORK_TYPES } from '@/lib/utils/constants'
import Toast from '@/components/Toast'

export default function RiskPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [workType, setWorkType] = useState('')
  const [evaluator, setEvaluator] = useState('')
  const [evalDate, setEvalDate] = useState(selectedDate)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  const matchedKey = workType ? Object.keys(RISK_DB).find(k => workType.includes(k)) : undefined
  const riskData = matchedKey ? RISK_DB[matchedKey] : null

  async function saveAssessment() {
    if (!selectedSite || !workType) { showToast('공종을 선택하세요', 'warn'); return }
    setSaving(true)
    await supabase.from('risk_assessments').insert({
      site_id: selectedSite.id,
      work_type: workType,
      eval_date: evalDate,
      evaluator,
      items: riskData?.items.map(item => ({ hazard: item.t, risk_level: 'medium', measure: '' })) ?? [],
    })
    setSaving(false)
    showToast('✅ 위험성 평가서 저장 완료!', 'ok')
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>위험성 평가서</span>
        <span className="tag tr">고용노동부 양식</span>
      </div>

      <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--br)' }}>⚖️ 중대재해처벌법 필수 서류</strong> — 공종 선택 시 위험 요소·감소 대책이 자동 완성됩니다.
      </div>

      <div className="card">
        <div className="card-t">평가 기본 정보</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>현장명</label>
            <input className="fi" value={selectedSite?.name ?? ''} readOnly />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>평가일</label>
            <input className="fi" type="date" value={evalDate} onChange={e => setEvalDate(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>평가 공종</label>
            <select className="fi" value={workType} onChange={e => setWorkType(e.target.value)}>
              <option value="">-- 공종 선택 --</option>
              {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>평가자</label>
            <input className="fi" placeholder="홍길동" value={evaluator} onChange={e => setEvaluator(e.target.value)} />
          </div>
        </div>
      </div>

      {riskData && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div className="card-t" style={{ margin: 0 }}>위험 요소 (자동완성)</div>
            <span style={{ background: 'var(--br)', color: 'var(--gold)', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>위험도: {riskData.lv}</span>
          </div>
          {riskData.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < riskData.items.length - 1 ? '1px solid var(--g1)' : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.c, flexShrink: 0, marginTop: '4px' }} />
              <div style={{ fontSize: '12px', color: 'var(--tx2)', lineHeight: 1.5 }}>{item.t}</div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-main" onClick={saveAssessment} disabled={saving || !workType} style={{ marginBottom: '8px' }}>
        {saving ? '저장 중...' : '💾 위험성 평가서 저장'}
      </button>
      <button className="btn btn-ghost" onClick={() => showToast('📄 PDF 출력 기능 준비 중', 'warn')}>📄 PDF 출력</button>

      <Toast message={toast} type={toastType} />
    </div>
  )
}
