-- ============================================================
-- ระบบจัดการหอพักนักศึกษา (Student Dormitory Management System)
-- Database Schema SQL (SQLite / MySQL / MariaDB / PostgreSQL Compatible)
-- ============================================================

-- 1. ตารางข้อมูลผู้ใช้งาน (Users)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(20) DEFAULT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'owner')),
    room_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 2. ตารางข้อมูลห้องพัก (Rooms)
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    floor INTEGER NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    price_per_month DECIMAL(10,2) NOT NULL,
    deposit DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    description TEXT,
    image_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางข้อมูลการจองห้องพัก (Bookings)
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    move_in_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 4. ตารางข้อมูลบิลค่าเช่าและการชำระเงิน (Rent Bills & Payments)
CREATE TABLE IF NOT EXISTS rent_bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM (e.g. 2026-09)
    room_fee DECIMAL(10,2) NOT NULL,
    water_fee DECIMAL(10,2) NOT NULL,
    electricity_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending_verification', 'paid', 'overdue')),
    slip_url TEXT DEFAULT NULL,
    paid_at TIMESTAMP DEFAULT NULL,
    verified_by INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. ตารางข้อมูลการแจ้งซ่อม (Repair Requests)
CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g. ไฟฟ้า, ประปา, เฟอร์นิเจอร์, เครื่องปรับอากาศ
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    admin_note TEXT DEFAULT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 6. ตารางประกาศข่าวสาร (Announcements)
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ดรรชนีเพื่อเพิ่มความเร็วในการค้นหา (Indexes)
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_rent_bills_status ON rent_bills(status);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
