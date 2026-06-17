'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import { calcInsurance } from '@/lib/utils/insurance'
import type { Worker } from '@/types'
import Toast from '@/components/Toast'

interface WorkerRow {
  worker: Worker
  days: number
  gross: number
  deduction: number
  net: number
}

export default function InvoicePage() {
  const { selectedSite, company } = useApp()
  const supabase = createClient()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [contractor, setContractor] = useState(company?.name ?? '')
  const [rows, setRows] = useState<WorkerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (company) setContractor(company.name) }, [company])
  useEffect(() => { if (selectedSite) loadData() }, [selectedSite, month])

  async function loadData() {
    if (!selectedSite) return
    setLoading(true)
    const start = `${month}-01`
    const end = `${month}-31`

    const { data: companyData } = await supabase.from('companies').select('id').single()
    if (!companyData) { setLoading(false); return }
    const { data: workers } = await supabase.from('workers').select('*').eq('company_id', companyData.id)

    const result: WorkerRow[] = []
    for (const w of (workers ?? []) as Worker[]) {
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
        result.push({ worker: w, days, gross, deduction: ins.total, net: ins.net })
      }
    }
    setRows(result)
    setLoading(false)
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  const totalGross = rows.reduce((s, r) => s + r.gross, 0)
  const totalDeduction = rows.reduce((s, r) => s + r.deduction, 0)
  const totalNet = rows.reduce((s, r) => s + r.net, 0)
  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>노무비 청구 내역서</span>
        <span className="tag tb">발주처 제출용</span>
      </div>

      {/* 조회 옵션 */}
      <div className="card" style={{ marginBottom: '10px' }}>
        <div className="card-t">청구 정보 설정</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>청구년월</label>
            <input className="fi" type="month" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>수급인</label>
            <input className="fi" placeholder="제이건설" value={contractor} onChange={e => setContractor(e.target.value)} />
          </div>
        </div>
        {!selectedSite && (
          <div style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>⚠️ 상단에서 현장을 선택하세요</div>
        )}
      </div>

      {/* 청구서 본문 */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cream3)', padding: '16px', marginBottom: '10px' }}>
        {/* 제목 */}
        <div style={{ textAlign: 'center', borderBottom: '2.5px solid var(--br)', paddingBottom: '10px', marginBottom: '14px' }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '24px', color: 'var(--br)', letterSpacing: '3px' }}>노무비 청구 내역서</div>
        </div>

        {/* 기본정보 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', marginBottom: '14px', lineHeight: 1.8 }}>
          <div><span style={{ color: 'var(--tx3)' }}>발주처:</span> <strong>{selectedSite?.client ?? '-'}</strong></div>
          <div><span style={{ color: 'var(--tx3)' }}>수급인:</span> <strong>{contractor || '-'}</strong></div>
          <div><span style={{ color: 'var(--tx3)' }}>현장명:</span> <strong>{selectedSite?.name ?? '-'}</strong></div>
          <div><span style={{ color: 'var(--tx3)' }}>청구년월:</span> <strong>{month}</strong></div>
          <div><span style={{ color: 'var(--tx3)' }}>청구일:</span> <strong>{today}</strong></div>
          <div><span style={{ color: 'var(--tx3)' }}>근로자 수:</span> <strong>{rows.length}명</strong></div>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--tx3)', fontSize: '12px' }}>집계 중...</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--tx3)', fontSize: '12px' }}>
            {selectedSite ? '해당 월에 출역 기록이 없습니다' : '현장을 선택하세요'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: 'var(--br)', color: 'var(--cream)' }}>
                    {['성명', '직종', '근무일', '일급', '지급총액', '공제액', '실지급액'].map(h => (
                      <th key={h} style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 700, fontSize: '10px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--g1)', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.worker.name}</td>
                      <td style={{ padding: '6px', textAlign: 'center', color: 'var(--tx3)', whiteSpace: 'nowrap' }}>{r.worker.role ?? '-'}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>{r.days}일</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.worker.daily_rate)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.gross)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--red)' }}>-{fmt(r.deduction)}</td>
                      <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--teal)' }}>{fmt(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--cream2)', fontWeight: 700 }}>
                    <td colSpan={4} style={{ padding: '8px 6px', textAlign: 'center', fontSize: '12px' }}>합 계</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>{fmt(totalGross)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: 'var(--red)' }}>-{fmt(totalDeduction)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: 'var(--teal)' }}>{fmt(totalNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 청구금액 박스 */}
            <div style={{ marginTop: '14px', border: '2px solid var(--br)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--tx3)', marginBottom: '4px' }}>청구금액 (실지급액 합계)</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '28px', color: 'var(--br)' }}>
                ₩{fmt(totalNet)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--tx3)', marginTop: '4px' }}>
                (일금 {toKoreanWon(totalNet)})
              </div>
            </div>

            {/* 서명란 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
              {['발주처 확인', '수급인 날인'].map(label => (
                <div key={label} style={{ border: '1px solid var(--g2)', borderRadius: '8px', padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--tx3)', marginBottom: '24px' }}>{label}</div>
                  <div style={{ borderBottom: '1px solid var(--g2)', height: '1px', marginBottom: '4px' }} />
                  <div style={{ fontSize: '9px', color: 'var(--g3)' }}>서명 또는 날인</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button className="btn btn-main" onClick={() => window.print()}>🖨️ 인쇄</button>
        <button className="btn btn-ghost" onClick={() => showToast('📊 엑셀 다운로드 기능 준비 중', 'warn')}>📊 엑셀</button>
      </div>
      <Toast message={toast} type={toastType} />
    </div>
  )
}

// 간단한 한국어 금액 읽기
function toKoreanWon(n: number): string {
  if (n === 0) return '영원정'
  const units = ['', '만', '억', '조']
  const parts: string[] = []
  let i = 0
  while (n > 0) {
    const rem = n % 10000
    if (rem > 0) parts.unshift(`${rem.toLocaleString()}${units[i]}`)
    n = Math.floor(n / 10000)
    i++
  }
  return parts.join(' ') + '원정'
}
