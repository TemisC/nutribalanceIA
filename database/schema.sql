-- ============================================================
-- NutrBalanceIA — Schema PostgreSQL para Supabase SQL Editor
-- Ejecutar en: supabase.com → Proyecto → SQL Editor → New Query
-- ============================================================

-- Habilitar extensión UUID (disponible por defecto en Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ────────────────────────────────────────────────────────
-- NOTA: El campo `id` usa el UUID de Supabase Auth. Al registrarse,
-- el auth.user.id se sincroniza con esta tabla.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,  -- Sincronizado con auth.users.id de Supabase
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client'
        CHECK (role IN ('client','coach','admin','superadmin')),
    plan_type TEXT NOT NULL DEFAULT 'free'
        CHECK (plan_type IN ('free','pro','pro_master')),
    tokens INT DEFAULT 0,
    avatar TEXT,
    coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    coach_tier TEXT DEFAULT 'standard'
        CHECK (coach_tier IN ('vip','vip_plus','standard')),
    commission_rate FLOAT DEFAULT 0.15,
    surname TEXT,
    date_of_birth DATE,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active','inactive')),
    billing_date TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    streak INT DEFAULT 0,
    pending_plan TEXT
        CHECK (pending_plan IN ('pro','pro_master')),
    last_payment_date TIMESTAMPTZ,
    token_reset_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USER BIOMETRICS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_biometrics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender TEXT NOT NULL CHECK (gender IN ('male','female')),
    age INT NOT NULL,
    height INT NOT NULL,  -- en cm
    weight FLOAT NOT NULL,  -- en kg
    activity_level TEXT NOT NULL,
    goal TEXT NOT NULL,
    diet_preference TEXT,
    medical_conditions TEXT,
    allergies TEXT,
    medications TEXT,
    injuries TEXT,
    sleep_hours FLOAT,
    stress_level TEXT,
    water_intake FLOAT,
    daily_meals INT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USER METRICS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_metrics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bmr INT NOT NULL,
    tdee INT NOT NULL,
    calories_target INT NOT NULL,
    protein_target INT NOT NULL,
    carbs_target INT NOT NULL,
    fats_target INT NOT NULL,
    water_target INT NOT NULL,  -- en ml
    bmi FLOAT,
    body_fat FLOAT,
    last_calculated TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROGRESS LOGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight FLOAT,
    calories_consumed INT DEFAULT 0,
    measurements_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- ─── COMMUNITY POSTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'motivation'
        CHECK (type IN ('achievement','question','recipe','motivation','milestone','hydration','workout')),
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','published','rejected','needs_edit')),
    likes INT DEFAULT 0,
    tokens_awarded INT DEFAULT 0,
    coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMMUNITY POST LIKES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_post_likes (
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
);

-- ─── COMMUNITY POST COMMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEAL PLANS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_data_json JSONB NOT NULL,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active','archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MEAL LOGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    calories INT NOT NULL,
    protein INT,
    carbs INT,
    fats INT,
    image_base64 TEXT,
    analysis_text TEXT,
    suggestions_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SHOPPING ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount TEXT,
    category TEXT,
    is_checked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MESSAGES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'chat'
        CHECK (type IN ('chat','system')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- ─── SUBSCRIPTION REQUESTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_role TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),
    amount FLOAT DEFAULT 0,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TOKEN USAGE LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_usage_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_logs_user ON token_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_token_logs_created ON token_usage_logs(created_at);

-- ─── ÍNDICES DE RENDIMIENTO ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_coach_id ON users(coach_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_coach_id ON community_posts(coach_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user ON meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_logs(user_id);

-- ─── ROW LEVEL SECURITY (Opcional - recomendado para producción) ──
-- Por ahora el backend usa SERVICE_ROLE_KEY que bypasea RLS.
-- Cuando quieras agregar RLS para acceso directo desde el frontend:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
