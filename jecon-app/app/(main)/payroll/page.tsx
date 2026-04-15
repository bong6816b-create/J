'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { calcInsurance } from '@/lib/utils/insurance'
import type { Worker } from '@/types'
import Toast from '@/components/Toast'

export default function PayrollPage() {
  const { selectedSite } = useApp()
  const supabase = createClient()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [workerTotals, setWorkerTotals] = useState<{ worker: Worker; days: number; gross: number; net: number }[]>([])
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { loadWorkers() }, [])
  useEffect(() => { if (workers.length > 0) loadPayroll() }, [workers, month, selectedSite])

  async function loadWorkers() {
    const { data: company } = await supabase.from('companies').select('id').single()
    if (!company) return
    const { data } = await supabase.from('workers').select('*').eq('company_id', company.id)
    setWorkers(data ?? [])
  }

  async function loadPayroll() {
    if (!selectedSite) return
    const start = `${month}-01`
    const end = `${month}-31`
    const totals: typeof workerTotals = []

    for (const w of workers) {
      const { data: atts } = await supabase
        .from('attendances')
        .select('days')
        .eq('worker_id', w.id)
        .eq('site_id', selectedSite.id)
        .gte('att_date', start)
        .lte('att_date', end)

      const days = (atts ?? []).reduce((s, a) => s + (a.days ?? 0), 0)
      if (days > 0) {
        const gross = days * w.daily_rate
        const ins = calcInsurance(gross, 'daily')
        totals.push({ worker: w, days, gross, net: ins.net })
      }
    }
    setWorkerTotals(totals)
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const totalGross = workerTotals.reduce((s, t) => s + t.gross, 0)
  const totalNet = workerTotals.reduce((s, t) => s + t.net, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>노무비 집계표</span>
        <span className="tag tg">전체 집계</span>
      </div>

      <div className="card">
        <div className="card-t">월 선택</div>
        <input className="fi" type="month" value={month} onChange={e => setMonth(e.target.value)} />
      </div>

      <div className="card">
        <div className="card-t">근로자별 노무비 내역</div>
        {workerTotals.length === 0 ? (
          <div className="empty-state"><div className="ei">📋</div>해당 월에 출역 기록이 없습니다</div>
        ) : (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>성명</th>
                  <th>근무일</th>
                  <th>총지급액</th>
                  <th>실수령액</th>
                </tr>
              </thead>
              <tbody>
                {workerTotals.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{item.worker.name}</td>
                    <td>{item.days}일</td>
                    <td style={{ fontFamily: 'monospace' }}>₩{item.gross.toLocaleString()}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--grn)', fontWeight: 700 }}>₩{item.net.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ background: 'linear-gradient(135deg, var(--br), var(--cara))', borderRadius: '10px', padding: '12px 14px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.6)' }}>총 지급액</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', color: 'var(--cream)' }}>₩{totalGross.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.6)' }}>총 실수령액</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: 'var(--gold)' }}>₩{totalNet.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button className="btn btn-main" onClick={() => showToast('📄 PDF 출력 기능 준비 중', 'warn')}>📄 PDF 출력</button>
        <button className="btn btn-ghost" onClick={() => showToast('📊 엑셀 다운로드 기능 준비 중', 'warn')}>📊 엑셀</button>
      </div>
      <Toast message={toast} type={toastType} />
    </div>
  )
}
