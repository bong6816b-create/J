'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { calcInsurance } from '@/lib/utils/insurance'
import type { Worker } from '@/types'
import Toast from '@/components/Toast'

type SubTab = 'deduct' | 'summary' | 'cost'

export default function CostPage() {
  const { selectedSite, selectedDate } = useApp()
  const supabase = createClient()
  const [subTab, setSubTab] = useState<SubTab>('deduct')

  // 공제액 계산
  const [payType, setPayType] = useState<'daily' | 'monthly'>('daily')
  const [payAmount, setPayAmount] = useState(180000)
  const [payDays, setPayDays] = useState(1)

  // 노무비 집계
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sumStart, setSumStart] = useState(selectedDate.slice(0, 7) + '-01')
  const [sumEnd, setSumEnd] = useState(selectedDate)
  const [workerTotals, setWorkerTotals] = useState<{ worker: Worker; days: number; total: number }[]>([])

  // 원가 관리
  const [costData, setCostData] = useState({
    contract: 38000000,
    labor: 0,
    material: 0,
    equipment: 0,
    etc: 0,
  })

  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => {
    loadWorkers()
  }, [])

  useEffect(() => {
    if (workers.length > 0) loadSummary()
  }, [workers, sumStart, sumEnd])

  async function loadWorkers() {
    const { data: company } = await supabase.from('companies').select('id').single()
    if (!company) return
    const { data } = await supabase.from('workers').select('*').eq('company_id', company.id)
    setWorkers(data ?? [])
  }

  async function loadSummary() {
    if (!selectedSite) return
    const totals: { worker: Worker; days: number; total: number }[] = []

    for (const w of workers) {
      const { data: atts } = await supabase
        .from('attendances')
        .select('days')
        .eq('worker_id', w.id)
        .eq('site_id', selectedSite.id)
        .gte('att_date', sumStart)
        .lte('att_date', sumEnd)

      const totalDays = (atts ?? []).reduce((s, a) => s + (a.days ?? 0), 0)
      if (totalDays > 0) {
        totals.push({ worker: w, days: totalDays, total: totalDays * w.daily_rate })
      }
    }

    setWorkerTotals(totals)
    setCostData(prev => ({ ...prev, labor: totals.reduce((s, t) => s + t.total, 0) }))
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type)
    setTimeout(() => setToast(''), 2500)
  }

  // Insurance calculation
  const ins = calcInsurance(payAmount * (payType === 'daily' ? payDays : 1), payType)
  const totalCost = costData.labor + costData.material + costData.equipment + costData.etc
  const profit = costData.contract - totalCost
  const margin = costData.contract > 0 ? (profit / costData.contract) * 100 : 0
  const ratio = costData.contract > 0 ? (totalCost / costData.contract) * 100 : 0
  const summaryTotal = workerTotals.reduce((s, t) => s + t.total, 0)

  const TABS: { key: SubTab; label: string }[] = [
    { key: 'deduct', label: '공제액 계산' },
    { key: 'summary', label: '노무비 집계' },
    { key: 'cost', label: '원가 관리' },
  ]

  return (
    <div>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '11px', overflowX: 'auto', paddingBottom: '2px' }} className="no-scrollbar">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ background: subTab === t.key ? 'var(--br)' : 'var(--g1)', border: `1.5px solid ${subTab === t.key ? 'var(--br)' : 'var(--cream3)'}`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: subTab === t.key ? 700 : 500, color: subTab === t.key ? 'var(--cream)' : 'var(--tx3)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--sans)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 공제액 계산 */}
      {subTab === 'deduct' && (
        <>
          <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
            일당 또는 월급을 입력하면 <strong style={{ color: 'var(--br)' }}>4대보험·소득세 공제액과 실수령액</strong>을 자동으로 계산합니다.
          </div>

          <div className="card">
            <div className="card-t">급여 입력</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>급여 유형</label>
                <select className="fi" value={payType} onChange={e => setPayType(e.target.value as 'daily' | 'monthly')}>
                  <option value="daily">일당 (일용직)</option>
                  <option value="monthly">월급 (상용직)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>급여 (원)</label>
                <input className="fi" type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} />
              </div>
            </div>
            {payType === 'daily' && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>근무일수</label>
                <input className="fi" type="number" min={1} max={31} value={payDays} onChange={e => setPayDays(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-t">공제 내역 (자동계산)</div>
            {[
              { label: '총 지급액', val: `₩${ins.gross?.toLocaleString() ?? 0}`, color: 'var(--tx)', bold: true },
              null,
              { label: '국민연금 (4.5%)', val: `-₩${ins.pension.toLocaleString()}`, color: 'var(--red)' },
              { label: '건강보험 (3.545%)', val: `-₩${ins.health.toLocaleString()}`, color: 'var(--red)' },
              { label: '장기요양 (건보×12.95%)', val: `-₩${ins.ltcare.toLocaleString()}`, color: 'var(--red)' },
              { label: '고용보험 (0.9%)', val: `-₩${ins.employ.toLocaleString()}`, color: 'var(--red)' },
              { label: '소득세', val: `-₩${ins.income.toLocaleString()}`, color: 'var(--red)' },
              { label: '지방소득세 (소득세×10%)', val: `-₩${ins.local.toLocaleString()}`, color: 'var(--red)' },
              { label: '총 공제액', val: `-₩${ins.total.toLocaleString()}`, color: 'var(--red)', bold: true },
            ].map((row, i) => {
              if (!row) return <div key={i} style={{ height: '6px' }} />
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < 8 ? '1px solid var(--g1)' : 'none' }}>
                  <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>{row.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: row.bold ? '13px' : '12px', fontWeight: row.bold ? 700 : 400, color: row.color }}>{row.val}</span>
                </div>
              )
            })}

            <div style={{ background: 'linear-gradient(135deg, var(--br), var(--cara))', borderRadius: '10px', padding: '12px 14px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.7)', marginBottom: '2px' }}>실수령액</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '26px', color: 'var(--gold)' }}>₩{ins.net.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,248,238,.6)' }}>공제율</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: 'var(--cream)' }}>
                  {ins.gross ? Math.round((ins.total / ins.gross) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-t">사업주 부담 (참고)</div>
            {[
              { label: '국민연금 (4.5%)', val: ins.pension },
              { label: '건강보험 (3.545%)', val: ins.health },
              { label: '장기요양', val: ins.ltcare },
              { label: '고용보험 (0.9%)', val: ins.employ },
              { label: '산재보험 (1.7%)', val: ins.accident ?? 0 },
              { label: '총 사업주 부담', val: (ins.pension + ins.health + ins.ltcare + ins.employ + (ins.accident ?? 0)) },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--g1)' : 'none' }}>
                <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>{row.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: i === arr.length - 1 ? 700 : 400, color: 'var(--cara)' }}>₩{row.val.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-main" onClick={() => showToast('📄 공제내역서 생성 완료!', 'ok')}>📄 공제내역서 출력</button>
        </>
      )}

      {/* 노무비 집계 */}
      {subTab === 'summary' && (
        <>
          <div className="card">
            <div className="card-t">기간 선택</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>시작일</label>
                <input className="fi" type="date" value={sumStart} onChange={e => setSumStart(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>종료일</label>
                <input className="fi" type="date" value={sumEnd} onChange={e => setSumEnd(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-t">근로자별 집계</div>
            {workerTotals.length === 0 ? (
              <div className="empty-state"><div className="ei">📋</div>해당 기간에 출역 기록이 없습니다</div>
            ) : (
              <>
                {workerTotals.map((item, i) => {
                  const deducted = calcInsurance(item.worker.daily_rate * item.days, 'daily')
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 10px', background: 'var(--g1)', borderRadius: '9px', marginBottom: '5px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.worker.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--tx3)' }}>{item.days}일 · 실수령 ₩{deducted.net.toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gd)', fontFamily: 'monospace', textAlign: 'right' }}>
                        ₩{item.total.toLocaleString()}
                      </div>
                    </div>
                  )
                })}
                <div style={{ background: 'linear-gradient(135deg, var(--br), var(--cara))', borderRadius: '10px', padding: '12px 14px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cream)' }}>총 노무비</span>
                  <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: 'var(--gold)' }}>₩{summaryTotal.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-main" onClick={() => showToast('📄 PDF 출력 기능 준비 중', 'warn')}>📄 PDF 출력</button>
            <button className="btn btn-ghost" onClick={() => showToast('📊 엑셀 다운로드 기능 준비 중', 'warn')}>📊 엑셀</button>
          </div>
        </>
      )}

      {/* 원가 관리 */}
      {subTab === 'cost' && (
        <>
          <div style={{ background: 'var(--cream2)', border: '1.5px solid var(--cream3)', borderRadius: '10px', padding: '11px 13px', marginBottom: '10px', fontSize: '11px', color: 'var(--tx2)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--br)' }}>💡 모든 금액 직접 수정 가능</strong> — 입력 즉시 손익 자동 계산
          </div>

          <div className="card">
            <div className="card-t">공사 원가 입력</div>
            {[
              { label: '📋 계약금액', key: 'contract' },
              { label: '👷 인건비 누계', key: 'labor' },
              { label: '🧱 자재비 누계', key: 'material' },
              { label: '🏗️ 장비비 누계', key: 'equipment' },
              { label: '📦 기타', key: 'etc' },
            ].map(row => (
              <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--g1)' }}>
                <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>{row.label}</span>
                <input type="number"
                  value={(costData as any)[row.key]}
                  onChange={e => setCostData(prev => ({ ...prev, [row.key]: Number(e.target.value) }))}
                  style={{ background: 'var(--g1)', border: '1.5px solid transparent', borderRadius: '7px', padding: '6px 9px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--tx)', textAlign: 'right', width: '130px', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--cara)'; e.target.style.background = 'var(--white)' }}
                  onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--g1)' }}
                />
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-t">공사 손익 (자동계산)</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--g1)' }}>
              <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>총 실행 원가</span>
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}>₩{totalCost.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--g1)' }}>
              <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>예상 이익</span>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', color: profit >= 0 ? 'var(--grn)' : 'var(--red)' }}>₩{profit.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--g1)' }}>
              <span style={{ fontSize: '12px', color: 'var(--tx3)' }}>이익률</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: margin >= 0 ? 'var(--grn)' : 'var(--red)' }}>{margin.toFixed(1)}%</span>
            </div>
            <div style={{ padding: '9px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px', fontWeight: 500 }}>
                <span style={{ color: 'var(--tx3)' }}>원가율</span>
                <span>{ratio.toFixed(1)}%</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{ width: `${Math.min(ratio, 100)}%`, background: ratio > 90 ? 'var(--red)' : ratio > 70 ? 'var(--gold)' : 'linear-gradient(90deg, var(--grn), #4ADE80)' }} />
              </div>
            </div>
          </div>
        </>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
