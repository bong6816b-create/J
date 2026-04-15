'use client'
interface Props {
  message: string
  type?: 'ok' | 'warn' | ''
}

export default function Toast({ message, type }: Props) {
  if (!message) return null
  const bg = type === 'ok' ? 'var(--grn)' : type === 'warn' ? 'var(--cara)' : 'var(--br)'
  return (
    <div style={{
      position: 'fixed',
      bottom: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: bg,
      color: 'var(--cream)',
      padding: '10px 18px',
      borderRadius: '28px',
      fontSize: '12px',
      fontWeight: 700,
      zIndex: 999,
      boxShadow: '0 5px 20px rgba(44,24,16,.25)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      fontFamily: 'var(--sans)',
    }}>
      {message}
    </div>
  )
}
