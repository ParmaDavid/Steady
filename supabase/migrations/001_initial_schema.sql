-- ============================================================
-- STEAD — Full Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS
-- ============================================================
CREATE TABLE households (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  owner_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan                TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'lifetime')),
  plan_activated_at   TIMESTAMPTZ,
  stripe_customer_id  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOUSEHOLD MEMBERS
-- ============================================================
CREATE TABLE household_members (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_email    TEXT,
  invite_token     TEXT UNIQUE,
  invite_accepted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER PREFERENCES
-- ============================================================
CREATE TABLE user_preferences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  household_id    UUID REFERENCES households(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_color    TEXT DEFAULT '#349470',
  ai_provider     TEXT NOT NULL DEFAULT 'claude' CHECK (ai_provider IN ('claude', 'openai', 'gemini')),
  ai_model        TEXT,
  ai_api_key_enc  TEXT,  -- encrypted user-supplied API key
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HEALTH LOGS
-- ============================================================
CREATE TABLE health_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  type             TEXT NOT NULL CHECK (type IN ('weight','bp','glucose','sleep','other')),
  value_numeric    NUMERIC,
  value_systolic   INTEGER,
  value_diastolic  INTEGER,
  value_pulse      INTEGER,
  unit             TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEDICATIONS
-- ============================================================
CREATE TABLE medications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  dose         TEXT,
  frequency    TEXT,
  start_date   DATE,
  end_date     DATE,
  prescriber   TEXT,
  note         TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCTOR VISITS
-- ============================================================
CREATE TABLE doctor_visits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  provider_name    TEXT NOT NULL,
  specialty        TEXT,
  reason           TEXT,
  notes            TEXT,
  next_appointment DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXERCISE LOGS
-- ============================================================
CREATE TABLE exercise_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  type         TEXT NOT NULL,
  duration_min INTEGER,
  distance     NUMERIC,
  distance_unit TEXT DEFAULT 'miles',
  calories     INTEGER,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEALS
-- ============================================================
CREATE TABLE meals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  description  TEXT NOT NULL,
  calories     INTEGER,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECIPES
-- ============================================================
CREATE TABLE recipes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  ingredients   JSONB NOT NULL DEFAULT '[]',
  instructions  TEXT,
  servings      INTEGER,
  prep_minutes  INTEGER,
  cook_minutes  INTEGER,
  tags          TEXT[] DEFAULT '{}',
  source_url    TEXT,
  image_path    TEXT,
  is_favorite   BOOLEAN NOT NULL DEFAULT FALSE,
  times_cooked  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEAL PLANS
-- ============================================================
CREATE TABLE meal_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  meal_type    TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  recipe_id    UUID REFERENCES recipes(id) ON DELETE SET NULL,
  custom_meal  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, date, meal_type)
);

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
CREATE TABLE calendar_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id     UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  start_datetime   TIMESTAMPTZ NOT NULL,
  end_datetime     TIMESTAMPTZ,
  all_day          BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule  TEXT,
  is_private       BOOLEAN NOT NULL DEFAULT FALSE,
  category         TEXT DEFAULT 'family' CHECK (category IN ('family','medical','vehicle','household','birthday','other')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOUSEHOLD TASKS
-- ============================================================
CREATE TABLE household_tasks (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  category       TEXT DEFAULT 'other' CHECK (category IN ('hvac','appliance','yard','cleaning','plumbing','electrical','other')),
  interval_days  INTEGER,
  last_done_date DATE,
  next_due_date  DATE,
  assigned_to    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOUSEHOLD TASK LOGS
-- ============================================================
CREATE TABLE household_task_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id      UUID NOT NULL REFERENCES household_tasks(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  done_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  done_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLIANCES
-- ============================================================
CREATE TABLE appliances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT,
  purchase_date   DATE,
  warranty_expiry DATE,
  manual_path     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id         UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  nickname             TEXT NOT NULL,
  year                 INTEGER,
  make                 TEXT,
  model                TEXT,
  trim                 TEXT,
  color                TEXT,
  vin                  TEXT,
  license_plate        TEXT,
  state                TEXT,
  current_mileage      INTEGER,
  purchase_date        DATE,
  insurance_policy     TEXT,
  insurance_expiry     DATE,
  registration_expiry  DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLE SERVICE LOGS
-- ============================================================
CREATE TABLE vehicle_service_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  household_id          UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  mileage               INTEGER,
  service_type          TEXT NOT NULL CHECK (service_type IN ('oil_change','tires','brakes','inspection','repair','wash','other')),
  description           TEXT,
  cost                  NUMERIC,
  shop_name             TEXT,
  next_service_date     DATE,
  next_service_mileage  INTEGER,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VEHICLE FUEL LOGS
-- ============================================================
CREATE TABLE vehicle_fuel_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  household_id      UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  mileage           INTEGER,
  gallons           NUMERIC,
  price_per_gallon  NUMERIC,
  total_cost        NUMERIC,
  station           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VAULT ITEMS
-- ============================================================
CREATE TABLE vault_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     TEXT NOT NULL CHECK (category IN ('insurance','legal','medical','id','financial','contacts','other')),
  title        TEXT NOT NULL,
  description  TEXT,
  file_path    TEXT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VAULT SHARE LINKS
-- ============================================================
CREATE TABLE vault_share_links (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token               TEXT UNIQUE NOT NULL,
  label               TEXT NOT NULL,
  pin_hash            TEXT NOT NULL,
  allowed_categories  TEXT[] DEFAULT '{}',
  expires_at          TIMESTAMPTZ NOT NULL,
  last_accessed_at    TIMESTAMPTZ,
  access_count        INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VAULT ACCESS LOG
-- ============================================================
CREATE TABLE vault_access_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_link_id  UUID NOT NULL REFERENCES vault_share_links(id) ON DELETE CASCADE,
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  accessed_at    TIMESTAMPTZ DEFAULT NOW(),
  ip_address     TEXT,
  user_agent     TEXT
);

-- ============================================================
-- CHAT HISTORY
-- ============================================================
CREATE TABLE chat_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content      TEXT NOT NULL,
  ai_provider  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_health_logs_household_user_date ON health_logs(household_id, user_id, date DESC);
CREATE INDEX idx_meals_household_user_date ON meals(household_id, user_id, date DESC);
CREATE INDEX idx_exercise_logs_household_user_date ON exercise_logs(household_id, user_id, date DESC);
CREATE INDEX idx_calendar_events_household_start ON calendar_events(household_id, start_datetime);
CREATE INDEX idx_household_tasks_household_due ON household_tasks(household_id, next_due_date);
CREATE INDEX idx_vehicle_service_household ON vehicle_service_logs(household_id, vehicle_id, date DESC);
CREATE INDEX idx_chat_history_household_user ON chat_history(household_id, user_id, created_at DESC);
CREATE INDEX idx_vault_share_links_token ON vault_share_links(token);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper function: is the current user a member of a household?
CREATE OR REPLACE FUNCTION is_household_member(hid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid
    AND user_id = auth.uid()
    AND invite_accepted = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_visits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_task_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliances            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_service_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fuel_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_share_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_access_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history          ENABLE ROW LEVEL SECURITY;

-- Households: members can read, owner can update
CREATE POLICY "household_read" ON households FOR SELECT USING (is_household_member(id));
CREATE POLICY "household_insert" ON households FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "household_update" ON households FOR UPDATE USING (owner_id = auth.uid());

-- Household members
CREATE POLICY "members_read" ON household_members FOR SELECT USING (is_household_member(household_id) OR user_id = auth.uid());
CREATE POLICY "members_insert" ON household_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM households WHERE id = household_id AND owner_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "members_update" ON household_members FOR UPDATE USING (user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM households WHERE id = household_id AND owner_id = auth.uid())
);

-- User preferences
CREATE POLICY "prefs_all" ON user_preferences FOR ALL USING (user_id = auth.uid());

-- Health logs, medications, doctor visits, exercise, meals — household members
CREATE POLICY "health_logs_all" ON health_logs FOR ALL USING (is_household_member(household_id));
CREATE POLICY "medications_all" ON medications FOR ALL USING (is_household_member(household_id));
CREATE POLICY "doctor_visits_all" ON doctor_visits FOR ALL USING (is_household_member(household_id));
CREATE POLICY "exercise_logs_all" ON exercise_logs FOR ALL USING (is_household_member(household_id));
CREATE POLICY "meals_all" ON meals FOR ALL USING (is_household_member(household_id));

-- Recipes, meal plans, calendar, tasks, appliances, vehicles — household members
CREATE POLICY "recipes_all" ON recipes FOR ALL USING (is_household_member(household_id));
CREATE POLICY "meal_plans_all" ON meal_plans FOR ALL USING (is_household_member(household_id));
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL USING (is_household_member(household_id));
CREATE POLICY "household_tasks_all" ON household_tasks FOR ALL USING (is_household_member(household_id));
CREATE POLICY "task_logs_all" ON household_task_logs FOR ALL USING (is_household_member(household_id));
CREATE POLICY "appliances_all" ON appliances FOR ALL USING (is_household_member(household_id));
CREATE POLICY "vehicles_all" ON vehicles FOR ALL USING (is_household_member(household_id));
CREATE POLICY "service_logs_all" ON vehicle_service_logs FOR ALL USING (is_household_member(household_id));
CREATE POLICY "fuel_logs_all" ON vehicle_fuel_logs FOR ALL USING (is_household_member(household_id));

-- Vault — household members only (share link access handled server-side)
CREATE POLICY "vault_items_all" ON vault_items FOR ALL USING (is_household_member(household_id));
CREATE POLICY "vault_links_all" ON vault_share_links FOR ALL USING (is_household_member(household_id));
CREATE POLICY "vault_log_insert" ON vault_access_log FOR INSERT WITH CHECK (TRUE); -- server-side only
CREATE POLICY "vault_log_read" ON vault_access_log FOR SELECT USING (is_household_member(household_id));

-- Chat history
CREATE POLICY "chat_history_all" ON chat_history FOR ALL USING (is_household_member(household_id));

-- ============================================================
-- TRIGGER: auto-create user_preferences + household on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create a default household
  INSERT INTO households (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'household_name', 'My Household'), NEW.id)
  RETURNING id INTO new_household_id;

  -- Add user as owner member
  INSERT INTO household_members (household_id, user_id, role, invite_accepted)
  VALUES (new_household_id, NEW.id, 'owner', TRUE);

  -- Create preferences
  INSERT INTO user_preferences (user_id, household_id, display_name)
  VALUES (NEW.id, new_household_id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
