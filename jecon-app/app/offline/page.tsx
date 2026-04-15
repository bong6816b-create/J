export default function OfflinePage() {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#FFF8EE', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>📡</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2C1810', marginBottom: '8px' }}>오프라인 상태입니다</div>
          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px', lineHeight: 1.6 }}>
            인터넷 연결을 확인해 주세요.<br />
            연결 복구 후 자동으로 정상 작동합니다.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#2C1810', color: '#FFF8EE', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            🔄 다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
