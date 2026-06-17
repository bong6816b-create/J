-- ============================================================
-- 제이건설 SaaS — Supabase PostgreSQL Schema v9
-- ============================================================

-- ── 회사 (멀티 테넌트) ──────────────────────────────────────
CREATE TABLE companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan       TEXT DEFAULT 'free', -- free | pro | enterprise
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 현장 ────────────────────────────────────────────────────
CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  client          TEXT,
  address         TEXT,
  start_date      DATE,
  end_date        DATE,
  contract_amount BIGINT DEFAULT 0,
  status          TEXT DEFAULT 'active', -- active | completed | paused
  share_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 근로자 ──────────────────────────────────────────────────
CREATE TABLE workers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  nationality TEXT DEFAULT 'ko',
  daily_rate  INTEGER DEFAULT 180000,
  phone       TEXT,
  email       TEXT,
  qr_code     TEXT UNIQUE DEFAULT 'QR-' || upper(encode(gen_random_bytes(4), 'hex')),
  visa_type   TEXT,
  visa_expire DATE,
  visa_regnum TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 공사일보 ─────────────────────────────────────────────────
CREATE TABLE daily_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES sites(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  weather     TEXT,
  work_type   TEXT,
  progress    INTEGER DEFAULT 0,
  note        TEXT,
  kr_workers  INTEGER DEFAULT 0,
  fo_workers  INTEGER DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, log_date)
);

-- ── 출역 기록 ────────────────────────────────────────────────
CREATE TABLE attendances (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID REFERENCES workers(id) ON DELETE CASCADE,
  log_id     UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  site_id    UUID REFERENCES sites(id),
  att_date   DATE NOT NULL,
  check_in   TIME,
  days       NUMERIC(3,1) DEFAULT 1,
  sig_url    TEXT,
  signed_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 자재 투입 ────────────────────────────────────────────────
CREATE TABLE materials (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id     UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  spec       TEXT,
  qty        NUMERIC,
  unit       TEXT,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 장비 투입 ────────────────────────────────────────────────
CREATE TABLE equipment_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id     UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  spec       TEXT,
  qty        INTEGER DEFAULT 1,
  hours      NUMERIC DEFAULT 8,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 현장 사진 ────────────────────────────────────────────────
CREATE TABLE site_photos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id    UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
  site_id   UUID REFERENCES sites(id),
  photo_url TEXT NOT NULL,
  work_type TEXT,
  location  TEXT,
  lat       NUMERIC(10,7),
  lng       NUMERIC(10,7),
  taken_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TBM 안전교육 ─────────────────────────────────────────────
CREATE TABLE tbm_records (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID REFERENCES sites(id) ON DELETE CASCADE,
  tbm_date   DATE NOT NULL,
  content    TEXT,
  language   TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── TBM 서명 ─────────────────────────────────────────────────
CREATE TABLE tbm_signatures (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tbm_id    UUID REFERENCES tbm_records(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id),
  sig_url   TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 위험성 평가서 ────────────────────────────────────────────
CREATE TABLE risk_assessments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID REFERENCES sites(id) ON DELETE CASCADE,
  work_type  TEXT NOT NULL,
  eval_date  DATE,
  evaluator  TEXT,
  items      JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 안전/하자 이슈 ───────────────────────────────────────────
CREATE TABLE safety_issues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES sites(id) ON DELETE CASCADE,
  issue_type  TEXT,
  issue_date  DATE,
  location    TEXT,
  description TEXT,
  status      TEXT DEFAULT '미처리',
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 근로계약서 ───────────────────────────────────────────────
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID REFERENCES workers(id),
  site_id         UUID REFERENCES sites(id),
  start_date      DATE,
  end_date        DATE,
  daily_wage      INTEGER,
  work_hours      TEXT,
  work_place      TEXT,
  task            TEXT,
  employer        TEXT,
  emp_sig_url     TEXT,
  worker_sig_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 하도급 업체 ──────────────────────────────────────────────
CREATE TABLE subcontractors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID REFERENCES sites(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  work_type       TEXT,
  ceo             TEXT,
  phone           TEXT,
  worker_count    INTEGER DEFAULT 0,
  contract_amount BIGINT DEFAULT 0,
  period          TEXT,
  doc_safety      BOOLEAN DEFAULT FALSE,
  doc_insurance   BOOLEAN DEFAULT FALSE,
  doc_license     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 장비 점검일지 ────────────────────────────────────────────
CREATE TABLE equip_checks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID REFERENCES sites(id),
  equip_name TEXT NOT NULL,
  equip_num  TEXT,
  driver     TEXT,
  check_date DATE NOT NULL,
  items      JSONB DEFAULT '[]',
  signed     BOOLEAN DEFAULT FALSE,
  sig_url    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 작업중지 기록 ────────────────────────────────────────────
CREATE TABLE work_stops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES sites(id),
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  hours       NUMERIC DEFAULT 0,
  reason      TEXT,
  description TEXT,
  weather     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 민원 기록 ────────────────────────────────────────────────
CREATE TABLE complaints (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        UUID REFERENCES sites(id),
  received_at    TIMESTAMPTZ,
  complaint_type TEXT,
  complainant    TEXT,
  phone          TEXT,
  description    TEXT,
  action         TEXT,
  status         TEXT DEFAULT '접수',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 사고 보고서 ──────────────────────────────────────────────
CREATE TABLE accidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID REFERENCES sites(id),
  occurred_at      TIMESTAMPTZ,
  location         TEXT,
  victim           TEXT,
  accident_type    TEXT,
  description      TEXT,
  immediate_action TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 공정표 ──────────────────────────────────────────────────
CREATE TABLE gantt_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    UUID REFERENCES sites(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  start_date DATE,
  end_date   DATE,
  progress   INTEGER DEFAULT 0,
  person     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 자재 수불부 ──────────────────────────────────────────────
CREATE TABLE stock_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES sites(id),
  record_date DATE,
  name        TEXT NOT NULL,
  record_type TEXT DEFAULT 'in', -- in | out
  qty         NUMERIC,
  unit        TEXT,
  unit_price  INTEGER DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 산업안전보건관리비 ────────────────────────────────────────
CREATE TABLE safety_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES sites(id),
  cost_date   DATE,
  item        TEXT,
  amount      INTEGER,
  description TEXT,
  proof_num   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 월별 노무비 집계 (뷰) ───────────────────────────────────
CREATE VIEW monthly_payroll AS
SELECT
  a.site_id,
  DATE_TRUNC('month', a.att_date) AS month,
  w.name,
  w.role,
  w.daily_rate,
  SUM(a.days)                    AS total_days,
  SUM(a.days * w.daily_rate)     AS total_pay
FROM attendances a
JOIN workers w ON a.worker_id = w.id
GROUP BY a.site_id, month, w.name, w.role, w.daily_rate;

-- ============================================================
-- 신규 회원 가입 시 회사 자동 생성 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO companies (owner_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'company_name', '내 회사'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON companies
  FOR ALL USING (owner_id = auth.uid());

-- sites
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_sites" ON sites
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- workers
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_workers" ON workers
  FOR ALL USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- daily_logs
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_daily_logs" ON daily_logs
  FOR ALL USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- attendances
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_attendances" ON attendances
  FOR ALL USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_materials" ON materials
  FOR ALL USING (
    log_id IN (
      SELECT dl.id FROM daily_logs dl
      JOIN sites s ON dl.site_id = s.id
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- equipment_usage
ALTER TABLE equipment_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_equipment" ON equipment_usage
  FOR ALL USING (
    log_id IN (
      SELECT dl.id FROM daily_logs dl
      JOIN sites s ON dl.site_id = s.id
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- site_photos
ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_photos_access" ON site_photos
  FOR ALL USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- tbm_records
ALTER TABLE tbm_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_tbm" ON tbm_records
  FOR ALL USING (
    site_id IN (
      SELECT s.id FROM sites s
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- tbm_signatures: joined through tbm_records
ALTER TABLE tbm_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tbm_sigs" ON tbm_signatures
  FOR ALL USING (
    tbm_id IN (
      SELECT tr.id FROM tbm_records tr
      JOIN sites s ON tr.site_id = s.id
      JOIN companies c ON s.company_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- 나머지 테이블들 (site_id 기반)
ALTER TABLE risk_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_issues      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equip_checks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_stops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accidents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_costs       ENABLE ROW LEVEL SECURITY;

-- site_id 기반 공통 정책 생성 함수 (반복 줄이기)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'risk_assessments','safety_issues','contracts',
    'subcontractors','equip_checks','work_stops',
    'complaints','accidents','gantt_items',
    'stock_records','safety_costs'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY site_based_access ON %I FOR ALL USING (
        site_id IN (
          SELECT s.id FROM sites s
          JOIN companies c ON s.company_id = c.id
          WHERE c.owner_id = auth.uid()
        )
      )', t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Supabase Storage 버킷 (대시보드에서 수동 생성 후 정책 적용)
-- ============================================================
-- 버킷 이름: site-photos  (공개 읽기)
-- 버킷 이름: signatures   (비공개)
-- 버킷 이름: videos       (비공개)

-- Storage 정책 예시
-- INSERT INTO storage.buckets (id, name, public) VALUES ('site-photos', 'site-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- ============================================================
-- 발주처 공유 뷰 (share_token으로 조회, RLS 우회)
-- ============================================================
CREATE OR REPLACE FUNCTION get_site_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID, name TEXT, client TEXT, address TEXT,
  start_date DATE, end_date DATE, status TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.client, s.address, s.start_date, s.end_date, s.status
  FROM sites s
  WHERE s.share_token = p_token;
END;
$$ LANGUAGE plpgsql;
