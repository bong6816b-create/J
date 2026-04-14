# 제이건설 — Claude Code 인계서 v9
> 이 파일을 Claude Code에 붙여넣으면 실제 서비스로 전환 시작

---

## 📁 첨부 파일
- `제이건설_v9_완성.html` — 완성된 UI 프로토타입 (디자인·기능 전부 구현됨)
- 이 인계서 — 전환 지침

---

## 🎯 프로젝트 목표
소규모 건설현장 소장을 위한 공사일보·노무비·안전관리 통합 SaaS.
현재 단일 HTML 파일(localStorage) → 실제 클라우드 서비스로 전환.

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Claude Code 시작 프롬프트 (그대로 붙여넣기)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
이 폴더에 있는 제이건설_v9_완성.html과 인계서를 읽어줘.

이것을 실제 배포 가능한 풀스택 웹 서비스로 전환해줘.
HTML의 디자인, 색상, 레이아웃, 기능 흐름을 그대로 유지해야 해.

=== 기술 스택 ===
- Frontend: Next.js 14 (App Router) + Tailwind CSS
- Backend: Next.js API Routes (서버리스)
- Database: Supabase (PostgreSQL + 실시간 구독)
- Auth: Supabase Auth (이메일/소셜 로그인)
- Storage: Supabase Storage (현장사진, 동영상, 서명이미지)
- 배포: Vercel
- PWA: next-pwa (오프라인 모드)

=== 우선순위 (순서대로) ===

1단계 — 기반 (Day 1~2):
  - Supabase 프로젝트 설정 + DB 스키마 생성
  - Next.js 프로젝트 생성 + Tailwind 설정
  - 로그인/회원가입 페이지
  - 현장 등록/선택 기능
  - 기본 레이아웃 (헤더, 사이드메뉴, 바텀 네비)

2단계 — 핵심 기능 (Day 3~5):
  - 공사일보 CRUD (날짜별 저장/조회)
  - 근로자 등록 + QR코드 발급
  - 출역 체크 + 전자서명
  - TBM 안전교육 (6개국어)
  - 현장사진 업로드 (Supabase Storage)

3단계 — 노무·원가 (Day 6~8):
  - 노무비 공제액 자동계산 (4대보험)
  - 노무비 집계표
  - 근로계약서 전자서명 저장
  - 기성 청구서 생성
  - 공사 원가 관리

4단계 — 안전·법규 (Day 9~11):
  - 위험성 평가서 (공종별 자동완성)
  - 안전보건대장
  - 산업안전보건관리비 사용 내역
  - 사고 즉시 보고서
  - 작업중지 기록

5단계 — 서류·관리 (Day 12~14):
  - 장비 점검일지
  - 하도급 업체 관리
  - 외국인 비자 만료 알림
  - 자재 수불부
  - 공정표 (간트차트 SVG)
  - 준공 체크리스트

6단계 — 공유·알림 (Day 15~17):
  - 발주처 공유 링크 (읽기전용 뷰)
  - 월별 결산 리포트 PDF
  - 카카오 알림톡 연동 (카카오 비즈채널 API)
  - GPS 사진 태그
  - 동영상 기록관리 (Supabase Storage)

7단계 — 마무리 (Day 18~21):
  - PWA 오프라인 모드 (Service Worker)
  - 반응형 최적화 (모바일 우선)
  - 성능 최적화 (이미지, 코드 스플리팅)
  - Vercel 배포

1단계부터 시작해줘. Supabase 프로젝트 설정과 DB 스키마부터.
```

---

## 🗄️ DB 스키마 (Supabase PostgreSQL)

```sql
-- 회사 (멀티 테넌트)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  plan TEXT DEFAULT 'free', -- free | pro | enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 현장
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client TEXT,
  address TEXT,
  start_date DATE,
  end_date DATE,
  contract_amount BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active', -- active | completed | paused
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근로자
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  nationality TEXT DEFAULT 'ko',
  daily_rate INTEGER DEFAULT 180000,
  phone TEXT,
  email TEXT,
  qr_code TEXT UNIQUE DEFAULT 'QR-' || upper(encode(gen_random_bytes(4), 'hex')),
  visa_type TEXT,
  visa_expire DATE,
  visa_regnum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공사일보
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  weather TEXT,
  work_type TEXT,
  progress INTEGER DEFAULT 0,
  note TEXT,
  kr_workers INTEGER DEFAULT 0,
  fo_workers INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, log_date)
);

-- 출역 기록
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  att_date DATE NOT NULL,
  check_in TIME,
  days NUMERIC(3,1) DEFAULT 1,
  sig_url TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자재 투입
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  spec TEXT,
  qty NUMERIC,
  unit TEXT,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비 투입
CREATE TABLE equipment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  spec TEXT,
  qty INTEGER DEFAULT 1,
  hours NUMERIC DEFAULT 8,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 현장 사진
CREATE TABLE site_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  photo_url TEXT NOT NULL,
  work_type TEXT,
  location TEXT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- TBM 안전교육
CREATE TABLE tbm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  tbm_date DATE NOT NULL,
  content TEXT,
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TBM 서명
CREATE TABLE tbm_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tbm_id UUID REFERENCES tbm_records(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  sig_url TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 위험성 평가서
CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  work_type TEXT NOT NULL,
  eval_date DATE,
  evaluator TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 안전/하자 이슈
CREATE TABLE safety_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  issue_type TEXT,
  issue_date DATE,
  location TEXT,
  description TEXT,
  status TEXT DEFAULT '미처리',
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근로계약서
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id),
  site_id UUID REFERENCES sites(id),
  start_date DATE,
  end_date DATE,
  daily_wage INTEGER,
  work_hours TEXT,
  work_place TEXT,
  task TEXT,
  employer TEXT,
  emp_sig_url TEXT,
  worker_sig_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 하도급 업체
CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  work_type TEXT,
  ceo TEXT,
  phone TEXT,
  worker_count INTEGER DEFAULT 0,
  contract_amount BIGINT DEFAULT 0,
  period TEXT,
  doc_safety BOOLEAN DEFAULT FALSE,
  doc_insurance BOOLEAN DEFAULT FALSE,
  doc_license BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비 점검일지
CREATE TABLE equip_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  equip_name TEXT NOT NULL,
  equip_num TEXT,
  driver TEXT,
  check_date DATE NOT NULL,
  items JSONB DEFAULT '[]',
  signed BOOLEAN DEFAULT FALSE,
  sig_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 작업중지 기록
CREATE TABLE work_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  hours NUMERIC DEFAULT 0,
  reason TEXT,
  description TEXT,
  weather TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 민원 기록
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  received_at TIMESTAMPTZ,
  complaint_type TEXT,
  complainant TEXT,
  phone TEXT,
  description TEXT,
  action TEXT,
  status TEXT DEFAULT '접수',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사고 보고서
CREATE TABLE accidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  occurred_at TIMESTAMPTZ,
  location TEXT,
  victim TEXT,
  accident_type TEXT,
  description TEXT,
  immediate_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 공정표
CREATE TABLE gantt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  progress INTEGER DEFAULT 0,
  person TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자재 수불부
CREATE TABLE stock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  record_date DATE,
  name TEXT NOT NULL,
  record_type TEXT DEFAULT 'in', -- in | out
  qty NUMERIC,
  unit TEXT,
  unit_price INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 산업안전보건관리비
CREATE TABLE safety_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  cost_date DATE,
  item TEXT,
  amount INTEGER,
  description TEXT,
  proof_num TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 월별 노무비 집계 (뷰)
CREATE VIEW monthly_payroll AS
SELECT
  a.site_id,
  DATE_TRUNC('month', a.att_date) AS month,
  w.name, w.role, w.daily_rate,
  SUM(a.days) AS total_days,
  SUM(a.days * w.daily_rate) AS total_pay
FROM attendances a
JOIN workers w ON a.worker_id = w.id
GROUP BY a.site_id, month, w.name, w.role, w.daily_rate;

-- RLS (Row Level Security) 설정
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
-- (나머지 테이블도 동일하게)

CREATE POLICY "users see own company data" ON sites
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );
```

---

## 🏗️ 프로젝트 구조

```
jecon-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← 헤더 + 사이드메뉴 + 바텀 네비
│   │   ├── page.tsx            ← 홈 대시보드
│   │   ├── daily/page.tsx      ← 공사일보
│   │   ├── attendance/page.tsx ← 출역 관리
│   │   ├── safety/page.tsx     ← 안전 TBM
│   │   ├── payroll/page.tsx    ← 노무비
│   │   ├── gantt/page.tsx      ← 공정표
│   │   ├── contract/page.tsx   ← 근로계약서
│   │   ├── billing/page.tsx    ← 기성 청구서
│   │   ├── risk/page.tsx       ← 위험성 평가서
│   │   ├── stock/page.tsx      ← 자재 수불부
│   │   ├── visa/page.tsx       ← 외국인 비자
│   │   ├── accident/page.tsx   ← 사고 보고
│   │   ├── complaint/page.tsx  ← 민원 관리
│   │   ├── monthly/page.tsx    ← 월별 리포트
│   │   └── settings/page.tsx   ← 설정
│   ├── api/
│   │   ├── share/[token]/route.ts   ← 발주처 공유 뷰
│   │   ├── pdf/daily/route.ts       ← 일보 PDF
│   │   ├── pdf/payroll/route.ts     ← 노무비 PDF
│   │   └── kakao/route.ts           ← 카카오 알림톡
│   └── share/[token]/page.tsx       ← 발주처 공개 페이지
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── SideMenu.tsx
│   │   ├── BottomNav.tsx
│   │   └── SiteSelector.tsx    ← 현장 검색 드롭다운
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── Calendar.tsx        ← 달력 (버그 수정 버전)
│   │   ├── SignaturePad.tsx    ← 전자서명 캔버스
│   │   ├── GanttChart.tsx      ← SVG 간트차트
│   │   └── LineChart.tsx       ← SVG 꺾은선 차트
│   └── features/
│       ├── daily/DailyForm.tsx
│       ├── worker/WorkerCard.tsx
│       └── tbm/TBMCard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── pdf/
│   │   └── generators.ts       ← PDF 생성 (react-pdf)
│   ├── kakao/
│   │   └── alimtalk.ts         ← 카카오 알림톡
│   └── utils/
│       ├── insurance.ts        ← 4대보험 계산
│       ├── wage.ts             ← 법정 노임단가
│       └── risk.ts             ← 공종별 위험 DB
├── public/
│   ├── manifest.json           ← PWA
│   └── sw.js                   ← Service Worker
└── middleware.ts               ← 인증 미들웨어
```

---

## 🎨 디자인 시스템 (HTML에서 그대로 유지)

```typescript
// tailwind.config.ts
const colors = {
  br: '#2C1810',      // 에스프레소 브라운 (primary)
  cara: '#7B4A2D',    // 카라멜
  cream: '#FFF8EE',   // 크림
  cream2: '#FFF2DC',
  cream3: '#FFE8C0',
  gold: '#F5C842',    // 골드 (accent)
  gd: '#D4A820',
  teal: '#0D9488',    // 틸 (secondary)
  grn: '#2E7D52',     // 그린
  red: '#E63B2E',     // 레드
}

// globals.css
// font-family: 'Bebas Neue' (숫자/헤딩) + 'Noto Sans KR' (본문)
```

---

## 💰 배포 비용 (월간)

| 서비스 | 플랜 | 비용 | 한도 |
|---|---|---|---|
| Vercel | Free | 무료 | 100GB 대역폭 |
| Supabase | Free | 무료 | DB 500MB, Storage 1GB |
| Supabase Auth | Free | 무료 | MAU 50,000명 |
| Resend (이메일) | Free | 무료 | 3,000건/월 |
| 카카오 알림톡 | 종량제 | 건당 8원 | - |
| **합계** | | **월 0원~** | 초기 무료 |

유저 증가 시:
- Supabase Pro: $25/월 (DB 8GB)
- Vercel Pro: $20/월

---

## 📱 앱스토어 배포 (웹 완성 후)

```bash
# Capacitor로 네이티브 앱 래핑
npm install @capacitor/core @capacitor/cli
npx cap init 제이건설 app.jecon.construction
npx cap add ios
npx cap add android

# 권한 설정 필요
# - CAMERA (QR 스캔, 현장 사진)
# - LOCATION (GPS 사진 태그)
# - PUSH_NOTIFICATIONS (알림)
```

---

## ⚡ 핵심 구현 포인트

### 1. 달력 (버그 수정 완료된 방식 유지)
```typescript
// ★ 요일 헤더와 날짜 셀이 동일 7컬럼 그리드에 위치해야 함
// DOM appendChild 방식 사용 (innerHTML 방식 사용 금지)
```

### 2. 4대보험 자동 계산
```typescript
// lib/utils/insurance.ts
export function calcInsurance(gross: number, type: 'daily' | 'monthly') {
  const pension = Math.round(gross * 0.045)
  const health = Math.round(gross * 0.03545)
  const ltcare = Math.round(health * 0.1295)
  const employ = Math.round(gross * 0.009)
  const income = type === 'daily'
    ? Math.max(0, Math.round((gross - 150000) * 0.06 * 0.55))
    : calcIncomeTax(gross)
  const local = Math.round(income * 0.1)
  return { pension, health, ltcare, employ, income, local,
    total: pension+health+ltcare+employ+income+local }
}
```

### 3. 오프라인 PWA
```javascript
// public/sw.js
// 일보 입력 데이터를 IndexedDB에 저장
// 온라인 복구 시 Supabase에 자동 동기화
```

### 4. 발주처 공유 뷰
```typescript
// app/share/[token]/page.tsx
// 토큰으로 현장 조회 → 읽기전용 대시보드
// 로그인 불필요, 링크만 있으면 접근
```

### 5. 카카오 알림톡
```typescript
// 카카오 비즈채널 API 연동
// 일보 미작성(오후 5시), 비자 만료 30일 전, TBM 미서명 알림
```

---

## 🚀 빠른 시작 명령어

```bash
# 1. 프로젝트 생성
npx create-next-app@latest jecon-app --typescript --tailwind --app

# 2. 패키지 설치
npm install @supabase/supabase-js @supabase/ssr
npm install @react-pdf/renderer          # PDF 생성
npm install next-pwa                     # PWA
npm install qrcode                       # QR 코드
npm install date-fns                     # 날짜 처리
npm install @capacitor/core @capacitor/cli  # 앱 래핑 (나중에)

# 3. 환경변수 설정
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
KAKAO_API_KEY=your_kakao_key
RESEND_API_KEY=your_resend_key

# 4. Vercel 배포
npx vercel --prod
```

---

## 📋 MVP 체크리스트 (Day 1~5 완료 기준)

- [ ] Supabase 프로젝트 생성 + 스키마 적용
- [ ] 로그인/회원가입 작동
- [ ] 현장 등록/선택 작동
- [ ] 날짜 선택 달력 작동 (버그 없이)
- [ ] 공사일보 저장/불러오기 작동
- [ ] 근로자 등록 + QR 발급 작동
- [ ] 출역 체크 + 전자서명 작동
- [ ] 현장 사진 업로드 작동
- [ ] Vercel 배포 완료 (실제 URL)
- [ ] 모바일 브라우저에서 정상 작동

---

*제이건설 v9 — 2026년 4월*
*Claude Code 인계서 | 전체 기능 33개 화면, DB 테이블 22개*
