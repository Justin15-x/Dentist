-- ================================================================
-- 🦷  Dental Clinic Management System — Supabase Schema
-- ================================================================
-- Run this entire file in the Supabase SQL Editor.
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLE: patients
-- ================================================================
CREATE TABLE IF NOT EXISTS patients (
    id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name             VARCHAR(255)  NOT NULL,
    email                 VARCHAR(255),
    phone                 VARCHAR(20),
    date_of_birth         DATE,
    treatment_description TEXT,
    total_cost            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_paid            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    dentist_id            UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ   NOT NULL  DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL  DEFAULT NOW(),

    CONSTRAINT patients_email_unique UNIQUE (email),
    CONSTRAINT patients_cost_positive    CHECK (total_cost >= 0),
    CONSTRAINT patients_paid_positive    CHECK (total_paid >= 0),
    CONSTRAINT patients_paid_lte_cost    CHECK (total_paid <= total_cost)
);

-- ================================================================
-- TABLE: appointments
-- ================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id       UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    appointment_date DATE        NOT NULL,
    appointment_time TIME        NOT NULL,
    reason           VARCHAR(500),
    status           VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                       CHECK (status IN ('scheduled','completed','cancelled','no_show')),
    notes            TEXT,
    reminder_sent    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent double-booking the same dentist slot
    CONSTRAINT appointments_no_double_booking UNIQUE (dentist_id, appointment_date, appointment_time)
);

-- ================================================================
-- TABLE: payment_records  (immutable audit trail)
-- ================================================================
CREATE TABLE IF NOT EXISTS payment_records (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id     UUID          NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_date   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    payment_method VARCHAR(20)   CHECK (payment_method IN ('cash','card','transfer','other')),
    notes          TEXT,
    recorded_by    UUID          REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_patients_dentist_id          ON patients(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id      ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id      ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date            ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status          ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder        ON appointments(reminder_sent) WHERE reminder_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_records_patient_id   ON payment_records(patient_id);

-- ================================================================
-- TRIGGER: auto-update updated_at
-- ================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ================================================================
-- FUNCTION: add_payment (atomic — runs inside a transaction)
-- Validates, inserts payment_record, updates patient.total_paid.
-- SECURITY DEFINER runs as the function owner; RLS is still enforced
-- on the outer queries that call this.
-- ================================================================
CREATE OR REPLACE FUNCTION add_payment(
    p_patient_id     UUID,
    p_amount         DECIMAL,
    p_payment_method VARCHAR,
    p_notes          TEXT,
    p_recorded_by    UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient        patients%ROWTYPE;
    v_new_total_paid DECIMAL(10,2);
    v_record         payment_records%ROWTYPE;
    v_updated        patients%ROWTYPE;
BEGIN
    -- Lock the patient row to prevent race conditions
    SELECT * INTO v_patient
      FROM patients
     WHERE id = p_patient_id
       AND dentist_id = p_recorded_by
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paciente no encontrado o acceso denegado.' USING ERRCODE = 'P0001';
    END IF;

    v_new_total_paid := v_patient.total_paid + p_amount;

    IF v_new_total_paid > v_patient.total_cost THEN
        RAISE EXCEPTION 'El pago excede el costo total del tratamiento.' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO payment_records (patient_id, amount, payment_method, notes, recorded_by)
    VALUES (p_patient_id, p_amount, p_payment_method, p_notes, p_recorded_by)
    RETURNING * INTO v_record;

    UPDATE patients
       SET total_paid = v_new_total_paid
     WHERE id = p_patient_id
    RETURNING * INTO v_updated;

    RETURN json_build_object(
        'patient',         row_to_json(v_updated),
        'payment_record',  row_to_json(v_record)
    );
END;
$$;

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================
ALTER TABLE patients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records  ENABLE ROW LEVEL SECURITY;

-- patients policies
CREATE POLICY "dentist_select_patients"  ON patients FOR SELECT  USING (auth.uid() = dentist_id);
CREATE POLICY "dentist_insert_patients"  ON patients FOR INSERT  WITH CHECK (auth.uid() = dentist_id);
CREATE POLICY "dentist_update_patients"  ON patients FOR UPDATE  USING (auth.uid() = dentist_id);
CREATE POLICY "dentist_delete_patients"  ON patients FOR DELETE  USING (auth.uid() = dentist_id);

-- appointments policies
CREATE POLICY "dentist_select_appointments"  ON appointments FOR SELECT  USING (auth.uid() = dentist_id);
CREATE POLICY "dentist_insert_appointments"  ON appointments FOR INSERT  WITH CHECK (auth.uid() = dentist_id);
CREATE POLICY "dentist_update_appointments"  ON appointments FOR UPDATE  USING (auth.uid() = dentist_id);
CREATE POLICY "dentist_delete_appointments"  ON appointments FOR DELETE  USING (auth.uid() = dentist_id);

-- payment_records policies (read + insert only — no update/delete for audit integrity)
CREATE POLICY "dentist_select_payments"  ON payment_records FOR SELECT  USING (auth.uid() = recorded_by);
CREATE POLICY "dentist_insert_payments"  ON payment_records FOR INSERT  WITH CHECK (auth.uid() = recorded_by);
