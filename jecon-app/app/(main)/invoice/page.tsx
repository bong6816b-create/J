'use client'
import { useState } from 'react'
import { useApp } from '@/components/MainLayoutClient'
import Toast from '@/components/Toast'

export default function InvoicePage() {
  const { selectedSite } = useApp()
  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    site: selectedSite?.name ?? '',
    client: selectedSite?.client ?? '',
    contractor: '',
  })
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'ok' | 'warn' | ''>('')

  function showToast(msg: string, type: 'ok' | 'warn' | '' = '') {
    setToast(msg); setToastType(type); setTimeout(() => setToast(''), 2500)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>노무비 청구 내역서</span>
        <span className="tag tb">발주처 제출용</span>
      </div>

      <div className="card">
        <div className="card-t">청구 정보</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>청구년월</label>
            <input className="fi" type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>현장명</label>
            <input className="fi" placeholder="○○아파트 신축공사" value={form.site} onChange={e => setForm(f => ({ ...f, site: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>발주처</label>
            <input className="fi" placeholder="(주)○○건설" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tx3)', display: 'block', marginBottom: '4px' }}>수급인</label>
            <input className="fi" placeholder="제이건설" value={form.contractor} onChange={e => setForm(f => ({ ...f, contractor: e.target.value }))} />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--cream3)', padding: '16px', marginBottom: '10px' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid var(--br)', paddingBottom: '10px', marginBottom: '12px' }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', color: 'var(--br)', letterSpacing: '2px' }}>노무비 청구 내역서</div>
        </div>
        {form.site ? (
          <div style={{ fontSize: '12px', lineHeight: 1.8 }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>발주처:</strong> {form.client}<br />
              <strong>수급인:</strong> {form.contractor}<br />
              <strong>현장명:</strong> {form.site}<br />
              <strong>청구년월:</strong> {form.month}
            </div>
            <div style={{ textAlign: 'center', color: 'var(--tx3)', padding: '20px 0', fontSize: '11px' }}>
              노무비 집계표에서 데이터를 조회하면 자동으로 작성됩니다
            </div>
          </div>
        ) : (
          <div className="empty-state"><div className="ei">📄</div>청구 정보를 입력하면 자동 생성됩니다</div>
        )}
      </div>

      <button className="btn btn-main" onClick={() => showToast('📄 청구서 PDF 생성 기능 준비 중', 'warn')} style={{ marginBottom: '8px' }}>📄 청구서 생성</button>
      <button className="btn btn-ghost" onClick={() => showToast('📧 이메일 발송 기능 준비 중', 'warn')}>📧 발주처 이메일 발송</button>
      <Toast message={toast} type={toastType} />
    </div>
  )
}
