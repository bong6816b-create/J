import type { InsuranceResult } from '@/types'

/**
 * 4대보험 + 소득세 자동계산
 * @param gross  총 지급액 (원)
 * @param type   'daily' | 'monthly'
 */
export function calcInsurance(
  gross: number,
  type: 'daily' | 'monthly' = 'daily'
): InsuranceResult {
  const pension = Math.round(gross * 0.045)          // 국민연금 4.5%
  const health  = Math.round(gross * 0.03545)        // 건강보험 3.545%
  const ltcare  = Math.round(health * 0.1295)        // 장기요양 (건강보험 × 12.95%)
  const employ  = Math.round(gross * 0.009)          // 고용보험 0.9%

  let income: number
  if (type === 'daily') {
    // 일용직: (일급 - 150,000) × 6% × 55%
    income = Math.max(0, Math.round((gross - 150000) * 0.06 * 0.55))
  } else {
    income = calcIncomeTax(gross)
  }

  const local = Math.round(income * 0.1)             // 지방소득세 10%
  const total = pension + health + ltcare + employ + income + local

  return { pension, health, ltcare, employ, income, local, total, net: gross - total }
}

function calcIncomeTax(monthly: number): number {
  // 간이세액표 기준 (단순화)
  const annual = monthly * 12
  if (annual <= 14_000_000)  return Math.round(annual * 0.06 / 12)
  if (annual <= 50_000_000)  return Math.round((840_000  + (annual - 14_000_000) * 0.15) / 12)
  if (annual <= 88_000_000)  return Math.round((6_240_000 + (annual - 50_000_000) * 0.24) / 12)
  if (annual <= 150_000_000) return Math.round((15_360_000 + (annual - 88_000_000) * 0.35) / 12)
  return Math.round((37_060_000 + (annual - 150_000_000) * 0.38) / 12)
}

export function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

export function formatWonM(amount: number): string {
  return (amount / 1_000_000).toFixed(1) + '백만'
}
