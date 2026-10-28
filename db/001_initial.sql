-- TUNNEL Staff: schema inicial. Rever numa branch de migrações antes de executar em produção.
-- Requer PostgreSQL 15+ e extensão btree_gist; sem dados ou segredos.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE IF NOT EXISTS staff (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 google_sub text NOT NULL UNIQUE,
 email text NOT NULL,
 display_name text NOT NULL,
 role text NOT NULL CHECK (role IN ('barber','manager','owner')),
 active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (email)
);
CREATE TABLE IF NOT EXISTS barbers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 staff_id uuid UNIQUE REFERENCES staff(id) ON DELETE RESTRICT,
 public_name text NOT NULL,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL,
 duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 5 AND 480),
 price_cents integer NOT NULL CHECK (price_cents >= 0),
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
 customer_name text NOT NULL CHECK (length(trim(customer_name)) BETWEEN 2 AND 120),
 customer_email text,
 customer_phone text,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at),
 CHECK (ends_at <= starts_at + interval '8 hours')
);
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlapping_active
 EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&)
 WHERE (status IN ('pending','confirmed'));
CREATE TABLE IF NOT EXISTS barber_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 barber_id uuid NOT NULL REFERENCES barbers(id) ON DELETE RESTRICT,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 reason text,
 CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
 action text NOT NULL,
 target_type text NOT NULL,
 target_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_start ON bookings(barber_id,starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_blocks_barber_start ON barber_blocks(barber_id,starts_at);
-- Defesa em profundidade: acessos directos via role aplicacional negados por omissão.
-- A API deve usar um papel de BD com privilégios mínimos, nunca credenciais admin no browser.
COMMIT;
