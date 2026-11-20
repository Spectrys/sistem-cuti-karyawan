-- Hapus tabel lama (tabel anak dulu) supaya file bisa dijalankan ulang
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS leave_approvals;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS divisions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- divisions
-- (leader_id dihubungkan ke users lewat ALTER TABLE di bawah,
-- karena users juga butuh divisions: relasinya saling menunjuk)
CREATE TABLE divisions(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    leader_id INTEGER UNIQUE, -- UNIQUE: satu orang hanya memimpin satu divisi
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- users (role: admin / employee / division_head / hrd)
CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee'
        CHECK (role IN ('admin', 'employee', 'division_head', 'hrd')),
    division_id INTEGER REFERENCES divisions(id) ON DELETE SET NULL,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE, -- dasar hitung masa kerja
    annual_quota NUMERIC(4,1) NOT NULL DEFAULT 12 CHECK (annual_quota >= 0),
    phone VARCHAR(30),
    address TEXT,
    profile_photo VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE divisions
    ADD CONSTRAINT fk_divisions_leader
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

-- leave_types : jenis cuti dan aturannya (diatur Admin, bukan hardcode)
CREATE TABLE leave_types(
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE, -- 'ANNUAL' dan 'SICK' dipakai kode aplikasi
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    quota_per_year NUMERIC(5,1) CHECK (quota_per_year >= 0), -- NULL = tidak dibatasi
    min_notice_days INTEGER NOT NULL DEFAULT 0 CHECK (min_notice_days >= 0), -- aturan H-n
    max_backdate_days INTEGER NOT NULL DEFAULT 0 CHECK (max_backdate_days >= 0), -- boleh diajukan n hari setelah mulai
    requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    deducts_annual_quota BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = memotong kuota cuti tahunan
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = tidak boleh dihapus
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- leave_requests : pengajuan cuti
CREATE TABLE leave_requests(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    total_days NUMERIC(4,1) NOT NULL CHECK (total_days > 0), -- hari kerja, bisa 0.5
    reason TEXT NOT NULL,
    handover_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- rekan pengganti
    handover_notes TEXT,
    attachment_path VARCHAR(255),
    leave_address TEXT,
    emergency_phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved_by_leader', 'approved', 'rejected', 'cancelled')),
    deducts_quota BOOLEAN NOT NULL DEFAULT FALSE, -- salinan aturan jenis cuti saat diajukan
    cancel_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date),
    CHECK (handover_user_id IS NULL OR handover_user_id <> user_id),
    CHECK (NOT is_half_day OR (start_date = end_date AND total_days = 0.5))
);

-- leave_approvals : riwayat keputusan (untuk timeline di halaman detail)
CREATE TABLE leave_approvals(
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    level VARCHAR(10) NOT NULL CHECK (level IN ('leader', 'hrd')),
    decision VARCHAR(10) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    decided_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, level), -- tiap level memutuskan satu kali
    CHECK (decision = 'approved' OR notes IS NOT NULL) -- penolakan wajib ada alasan
);

-- notifications : mis. pemberitahuan ke rekan pengganti
CREATE TABLE notifications(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    related_request_id INTEGER REFERENCES leave_requests(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- holidays : hari libur (dipakai saat menghitung hari kerja)
CREATE TABLE holidays(
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL
);

-- Index untuk kolom yang sering dipakai di WHERE / JOIN
CREATE INDEX idx_users_division ON users(division_id);
CREATE INDEX idx_requests_user ON leave_requests(user_id);
CREATE INDEX idx_requests_status ON leave_requests(status);
CREATE INDEX idx_requests_dates ON leave_requests(start_date, end_date);


-- Jenis cuti
INSERT INTO leave_types
    (code, name, description, quota_per_year, min_notice_days, max_backdate_days,
    requires_attachment, deducts_annual_quota, is_system)
VALUES
    ('ANNUAL', 'Cuti Tahunan', '12 hari kerja per tahun, tidak termasuk Sabtu dan Minggu.', 12, 3, 0, FALSE, TRUE, TRUE), -- id 1
    ('SICK', 'Cuti Sakit', 'Wajib surat dokter. Boleh diajukan maksimal 3 hari setelah mulai sakit.', NULL, 0, 3, TRUE, FALSE, TRUE), -- id 2
    ('MARRIAGE', 'Cuti Menikah', 'Cuti untuk pernikahan karyawan.', 3, 14, 0, TRUE, FALSE, FALSE), -- id 3
    ('MATERNITY', 'Cuti Melahirkan', 'Cuti untuk persalinan.', 90, 30, 0, TRUE, FALSE, FALSE), -- id 4
    ('BEREAVEMENT', 'Cuti Duka', 'Anggota keluarga inti meninggal.', 2, 0, 3, FALSE, FALSE, FALSE), -- id 5
    ('UNPAID', 'Cuti Tanpa Gaji', 'Cuti di luar kuota, tanpa gaji.', NULL, 7, 0, FALSE, FALSE, FALSE); -- id 6

-- Users (password: password123, hash bcrypt)
INSERT INTO users (username, email, password_hash, full_name, role, join_date, phone, address) VALUES
    ('admin', 'admin@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Administrator', 'admin', '2024-01-02', '081200000001', 'Makassar'), -- id 1
    ('hrd', 'hrd@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Hana Kusuma', 'hrd', '2024-01-02', '081200000002', 'Makassar'), -- id 2
    ('kadiv_it', 'kadiv.it@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Budi Santoso', 'division_head', '2023-03-01', '081200000003', 'Makassar'), -- id 3
    ('kadiv_mkt', 'kadiv.mkt@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Siti Rahmawati', 'division_head', '2023-05-15', '081200000004', 'Makassar'), -- id 4
    ('andi', 'andi@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Andi Pratama', 'employee', '2024-02-01', '081200000005', 'Makassar'), -- id 5
    ('dewi', 'dewi@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Dewi Lestari', 'employee', '2024-06-10', '081200000006', 'Makassar'), -- id 6
    ('rudi', 'rudi@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Rudi Hartono', 'employee', '2025-01-20', '081200000007', 'Makassar'), -- id 7
    ('maya', 'maya@cuti.test', '$2b$10$YUnQB/lQ0hb7wp0SjS0olukQNzfPgu9.3rKMvi5wBUroZRSXeEcJ2', 'Maya Putri', 'employee', '2026-06-01', '081200000008', 'Makassar'); -- id 8 (masa kerja < 1 tahun)

-- Divisi + ketua (leader_id merujuk id user di atas)
INSERT INTO divisions (name, description, leader_id) VALUES
    ('Teknologi Informasi', 'Pengembangan dan operasional sistem.', 3), -- id 1, ketua: kadiv_it
    ('Pemasaran', 'Pemasaran dan hubungan pelanggan.', 4); -- id 2, ketua: kadiv_mkt

-- Penempatan anggota ke divisi
UPDATE users SET division_id = 1 WHERE id IN (3, 5, 6); -- kadiv_it, andi, dewi
UPDATE users SET division_id = 2 WHERE id IN (4, 7, 8); -- kadiv_mkt, rudi, maya

-- Hari libur nasional tetap 2026
INSERT INTO holidays (holiday_date, name) VALUES
    ('2026-01-01', 'Tahun Baru Masehi'),
    ('2026-05-01', 'Hari Buruh'),
    ('2026-06-01', 'Hari Lahir Pancasila'),
    ('2026-08-17', 'Hari Kemerdekaan RI'),
    ('2026-12-25', 'Hari Raya Natal');

-- Contoh pengajuan cuti (status bervariasi supaya dashboard ada isinya)
INSERT INTO leave_requests
    (user_id, leave_type_id, start_date, end_date, total_days, reason,
    handover_user_id, handover_notes, attachment_path, leave_address,
    emergency_phone, status, deducts_quota)
VALUES
    (5, 1, '2026-12-08', '2026-12-10', 3, 'Acara keluarga', 6, 'Pantau tiket harian.', NULL, 'Makassar', '081300000001', 'pending', TRUE), -- id 1: andi
    (6, 1, '2026-12-14', '2026-12-16', 3, 'Liburan', 5, 'Deploy mingguan ditunda.', NULL, 'Bali', '081300000002', 'approved_by_leader', TRUE), -- id 2: dewi
    (7, 2, '2026-11-10', '2026-11-11', 2, 'Demam tinggi', 8, 'Laporan mingguan ke Maya.', 'uploads/surat_rudi.pdf', 'Makassar', '081300000003', 'approved', FALSE), -- id 3: rudi
    (3, 1, '2026-12-28', '2026-12-30', 3, 'Akhir tahun', NULL, NULL, NULL, 'Makassar', '081300000004', 'pending', TRUE); -- id 4: kadiv_it (langsung ke HRD)

-- Riwayat approval untuk pengajuan di atas
INSERT INTO leave_approvals (request_id, approver_id, level, decision, notes) VALUES
    (2, 3, 'leader', 'approved', 'Disetujui, serah terima sudah jelas.'),
    (3, 4, 'leader', 'approved', NULL),
    (3, 2, 'hrd', 'approved', 'Semoga lekas sehat.');

-- Notifikasi ke rekan pengganti
INSERT INTO notifications (user_id, message, related_request_id) VALUES
    (6, 'Andi Pratama menunjuk Anda sebagai rekan pengganti pada 8-10 Des 2026.', 1),
    (5, 'Dewi Lestari menunjuk Anda sebagai rekan pengganti pada 14-16 Des 2026.', 2);
