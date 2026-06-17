'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const COST_CATEGORIES = [
  '안전관리자 인건비',
  '안전시설물 설치',
  '보호구 구입',
  '안전교육 훈련',
  '안전 점검·진단',
  '위험성 평가 비용',
  '응급처치 의약품',
  '기타',
]

export default function SafetyCostPage() {
  const { selectedSite } = useApp()
  const supabase = createClient()
  const [records, setRecords] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ use_date: new Date().toISOString().slice(0, 10), category: COST_CATEGORIES[0], description: '', amount: 0, receipt_no: '' })
  const [contractAmount, setContractAmount] = useState(0)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  useEffect(() => { if (selectedSite) loadData() }, [selectedSite])

  async function loadData() {
    if (!selectedSite) return
    // Load contract amount from site
    const { data: site } = await supabase.from('sites').select('contract_amount').eq('id', selectedSite.id).single()
    setContractAmount(site?.contract_amount ?? 0)
    // Load safety cost records stored as stock_records with type='in' and specific naming
    const { data } = await supabase.from('stock_records').select('*')
      .eq('site_id', selectedSite.id)
      .eq('record_type', 'out')
      .like('name', '안전관리비:%')
      .order('record_date', { ascending: false })
    setRecords(data ?? [])
  }

  async function addRecord() {
    if (!selectedSite || !form.amount) { showToast('금액을 입력하세요', 'warn'); return }
    const { data } = await supabase.from('stock_records').insert({
      site_id: selectedSite.id,
      record_date: form.use_date,
      name: `안전관리비:${form.category}`,
      record_type: 'out',
      qty: 1,
      unit: '건',
      unit_price: form.amount,
      note: `${form.description}${form.receipt_no ? ` | 영수증:${form.receipt_no}` : ''}`,
    }).select().single()
    if (data) { setRecords(prev => [data, ...prev]); setShowForm(false); showToast('✅ 사용내역 등록 완료', 'ok') }
  }

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  // 산업안전보건관리비: 계약금액의 약 2.5% (토목공사 기준)
  const legalBudget = Math.round(contractAmount * 0.025)
  const usedTotal = records.reduce((s, r) => s + r.unit_price, 0)
  const remaining = legalBudget - usedTotal
  const usedRatio = legalBudget > 0 ? (usedTotal / legalBudget) * 100 : 0

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>산업안전보건관리비</span>
        <span className="tag ty">사용내역</span>
      </div>

      {/* 예산 현황 */}
      <div style={{ background: 'var(--br)', borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: '10px', boxShadow: '0 4px 18px rgba(44,24,16,.22)' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,248,238,.6)', marginBottom: '3px' }}>법정 안전관리비 (계약금액 × 2.5%)</div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '26px', color: 'var(--gold)', lineHeight: 1.1 }}>₩{legalBudget.toLocaleString()}</div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,248,238,.5)' }}>사용액</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--cream)', fontFamily: 'monospace' }}>₩{usedTotal.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,248,238,.5)' }}>잔액</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: remaining >= 0 ? 'var(--grn2)' : 'var(--red)', fontFamily: 'monospace' }}>₩{remaining.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,248,238,.5)', marginBottom: '3px' }}>
            <span>사용률</span><span>{usedRatio.toFixed(1)}%</span>
          </div>
          <div style={{ height: '5px', background: 'rgba(255,255,255,.2)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(usedRatio, 100)}%`, background: usedRatio > 100 ? 'var(--red)' : 'var(--gold)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700 }}>사용 내역</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowForm(o => !o)}>+ 사용 등록</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '10px' }}>
          <div className="card-t">사용내역 등록</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>사용일자</label>
              <input className="fi" type="date" value={form.use_date} onChange={e => setForm(f => ({ ...f, use_date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>항목</label>
              <select className="fi" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {COST_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>사용 내용</label>
            <input className="fi" placeholder="안전모 20개 구입" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>금액 (원)</label>
              <input className="fi" type="number" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>영수증 번호</label>
              <input className="fi" placeholder="선택사항" value={form.receipt_no} onChange={e => setForm(f => ({ ...f, receipt_no: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="btn btn-gold" onClick={addRecord}>등록</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>취소</button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: '40px' }}>
          <div className="ei">🦺</div>
          <div style={{ fontWeight: 700 }}>사용 내역이 없습니다</div>
        </div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>날짜</th><th>항목</th><th>내용</th><th>금액</th></tr></thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>{r.record_date}</td>
                  <td style={{ fontSize: '10px' }}>{r.name.replace('안전관리비:', '')}</td>
                  <td style={{ fontSize: '10px' }}>{r.note?.split('|')[0]?.trim()}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap' }}>₩{r.unit_price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast message={toast} type={toastType} />
    </div>
  )
}
