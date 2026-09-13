-- ============================================================
-- ระบบจัดการหอพักนักศึกษา (Student Dormitory Management System)
-- Database Dump for AppServ (MySQL / MariaDB / phpMyAdmin)
-- Encoding: UTF-8 (utf8mb4)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `dormitory` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dormitory`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. ตารางข้อมูลห้องพัก (rooms)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `room_number` VARCHAR(10) NOT NULL,
  `floor` INT NOT NULL,
  `room_type` VARCHAR(50) NOT NULL,
  `price_per_month` DECIMAL(10,2) NOT NULL,
  `deposit` DECIMAL(10,2) NOT NULL,
  `status` ENUM('available', 'occupied', 'maintenance', 'reserved') NOT NULL DEFAULT 'available',
  `description` TEXT DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_room_number` (`room_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่างห้องพัก
INSERT INTO `rooms` (`id`, `room_number`, `floor`, `room_type`, `price_per_month`, `deposit`, `status`, `description`, `image_url`) VALUES
(1, '101', 1, 'ห้องเดี่ยว Standard', 4500.00, 5000.00, 'available', 'เตียงเดี่ยว 3.5 ฟุต, โต๊ะอ่านหนังสือ, ตู้เสื้อผ้า, เครื่องปรับอากาศ, ระเบียง', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'),
(2, '102', 1, 'ห้องเดี่ยว Standard', 4500.00, 5000.00, 'occupied', 'เตียงเดี่ยว 3.5 ฟุต, โต๊ะอ่านหนังสือ, ตู้เสื้อผ้า, เครื่องปรับอากาศ, ระเบียง', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80'),
(3, '103', 1, 'ห้องคู่ Deluxe', 5500.00, 6000.00, 'available', 'เตียงคู่ 3.5 ฟุต x 2, โต๊ะทำงานคู่, ตู้เสื้อผ้าใหญ่, เครื่องปรับอากาศ, ตู้เย็น, ไมโครเวฟ', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'),
(4, '104', 1, 'ห้องคู่ Deluxe', 5500.00, 6000.00, 'maintenance', 'เตียงคู่ 3.5 ฟุต x 2, โต๊ะทำงานคู่, ตู้เสื้อผ้าใหญ่, เครื่องปรับอากาศ (กำลังซ่อม)', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'),
(5, '201', 2, 'ห้องเดี่ยว Standard', 4700.00, 5000.00, 'occupied', 'ชั้น 2 วิวสวน, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, สมาร์ททีวี', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80'),
(6, '202', 2, 'ห้องเดี่ยว Standard', 4700.00, 5000.00, 'available', 'ชั้น 2 วิวสวน, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, ตู้เสื้อผ้าใหญ่', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'),
(7, '203', 2, 'ห้อง VIP Suite', 6500.00, 7000.00, 'occupied', 'ชั้น 2 ห้องมุม กว้างพิเศษ, เตียง 6 ฟุต, โซฟาชุดรับแขก, โต๊ะทำงาน, ตู้เย็นใหญ่', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80'),
(8, '204', 2, 'ห้อง VIP Suite', 6500.00, 7000.00, 'available', 'ชั้น 2 ห้องมุม กว้างพิเศษ, เตียง 6 ฟุต, โซฟาชุดรับแขก, โต๊ะทำงาน, ตู้เย็นใหญ่', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'),
(9, '301', 3, 'ห้องเดี่ยว Standard', 4800.00, 5000.00, 'reserved', 'ชั้น 3 เงียบสงบ, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, โต๊ะอ่านหนังสือ', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80'),
(10, '302', 3, 'ห้องเดี่ยว Standard', 4800.00, 5000.00, 'available', 'ชั้น 3 เงียบสงบ, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, โต๊ะอ่านหนังสือ', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80');

-- ------------------------------------------------------------
-- 2. ตารางข้อมูลผู้ใช้งาน (users)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `student_id` VARCHAR(20) DEFAULT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `role` ENUM('student', 'admin', 'owner') NOT NULL,
  `room_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `fk_users_room` (`room_id`),
  CONSTRAINT `fk_users_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่างผู้ใช้งาน
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `student_id`, `phone`, `email`, `role`, `room_id`) VALUES
(1, 'somchai', 'pass123', 'สมชาย ใจดี', '650100123', '081-234-5678', 'somchai@std.university.ac.th', 'student', 2),
(2, 'suda', 'pass123', 'สุดา รักเรียน', '650100456', '082-345-6789', 'suda@std.university.ac.th', 'student', 5),
(3, 'ananya', 'pass123', 'อนัญญ์ รุ่งเรือง', '660100789', '083-456-7890', 'ananya@std.university.ac.th', 'student', 7),
(4, 'wichai', 'pass123', 'วิชัย ขยันเรียน', '660100999', '084-567-8901', 'wichai@std.university.ac.th', 'student', NULL),
(5, 'admin1', 'admin123', 'คุณปิยาภรณ์ ผู้ดูแลหอ', NULL, '089-111-2222', 'caretaker@dorm.com', 'admin', NULL),
(6, 'owner1', 'owner123', 'คุณดารานี เจ้าของหอพัก', NULL, '089-999-8888', 'owner@dorm.com', 'owner', NULL);

-- ------------------------------------------------------------
-- 3. ตารางข้อมูลการจองห้องพัก (bookings)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `move_in_date` DATE NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_bookings_student` (`student_id`),
  KEY `fk_bookings_room` (`room_id`),
  CONSTRAINT `fk_bookings_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookings_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่างการจอง
INSERT INTO `bookings` (`id`, `student_id`, `room_id`, `move_in_date`, `status`, `note`) VALUES
(1, 4, 9, '2026-10-01', 'pending', 'ขอห้องเงียบสงบ สำหรับอ่านหนังสือเตรียมสอบ'),
(2, 1, 2, '2026-06-01', 'approved', 'ย้ายเข้าต้นเทอม 1'),
(3, 2, 5, '2026-06-01', 'approved', 'ย้ายเข้าต้นเทอม 1');

-- ------------------------------------------------------------
-- 4. ตารางข้อมูลบิลค่าเช่าและการชำระเงิน (rent_bills)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `rent_bills`;
CREATE TABLE `rent_bills` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `month_year` VARCHAR(7) NOT NULL,
  `room_fee` DECIMAL(10,2) NOT NULL,
  `water_fee` DECIMAL(10,2) NOT NULL,
  `electricity_fee` DECIMAL(10,2) NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('unpaid', 'pending_verification', 'paid', 'overdue') NOT NULL DEFAULT 'unpaid',
  `slip_url` TEXT DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `verified_by` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_bills_student` (`student_id`),
  KEY `fk_bills_room` (`room_id`),
  KEY `fk_bills_verifier` (`verified_by`),
  CONSTRAINT `fk_bills_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bills_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bills_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่างบิลค่าเช่า
INSERT INTO `rent_bills` (`id`, `student_id`, `room_id`, `month_year`, `room_fee`, `water_fee`, `electricity_fee`, `total_amount`, `due_date`, `status`, `slip_url`, `paid_at`) VALUES
(1, 1, 2, '2026-09', 4500.00, 180.00, 450.00, 5130.00, '2026-09-05', 'pending_verification', 'https://via.placeholder.com/400x600/3b82f6/ffffff?text=Slip+Transfer+5130.00+THB', '2026-09-03 10:15:00'),
(2, 1, 2, '2026-08', 4500.00, 160.00, 420.00, 5080.00, '2026-08-05', 'paid', 'https://via.placeholder.com/400x600/10b981/ffffff?text=Slip+August+Paid', '2026-08-04 14:20:00'),
(3, 2, 5, '2026-09', 4700.00, 200.00, 510.00, 5410.00, '2026-09-05', 'paid', 'https://via.placeholder.com/400x600/10b981/ffffff?text=Slip+September+Paid', '2026-09-02 09:30:00'),
(4, 2, 5, '2026-08', 4700.00, 190.00, 480.00, 5370.00, '2026-08-05', 'paid', 'https://via.placeholder.com/400x600/10b981/ffffff?text=Slip+August+Paid', '2026-08-03 11:00:00'),
(5, 3, 7, '2026-09', 6500.00, 250.00, 720.00, 7470.00, '2026-09-05', 'unpaid', NULL, NULL);

-- ------------------------------------------------------------
-- 5. ตารางข้อมูลการแจ้งซ่อม (repairs)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `repairs`;
CREATE TABLE `repairs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `admin_note` TEXT DEFAULT NULL,
  `reported_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_repairs_student` (`student_id`),
  KEY `fk_repairs_room` (`room_id`),
  CONSTRAINT `fk_repairs_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repairs_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่างแจ้งซ่อม
INSERT INTO `repairs` (`id`, `student_id`, `room_id`, `title`, `description`, `category`, `priority`, `status`, `admin_note`) VALUES
(1, 1, 2, 'เครื่องปรับอากาศเย็นน้อย มีเสียงดัง', 'แอร์ห้อง 102 มีเสียงดังกวนเวลานอน และเย็นช้ากว่าปกติ', 'เครื่องปรับอากาศ', 'high', 'in_progress', 'ช่างจะเข้าดูวันเสาร์ช่วงบ่าย 14:00 น.'),
(2, 2, 5, 'หลอดไฟระเบียงดับ', 'หลอดไฟตรงระเบียงหลังห้อง 201 ขาด ต้องการให้เปลี่ยนหลอดใหม่', 'ไฟฟ้า', 'low', 'completed', 'ผู้ดูแลเปลี่ยนหลอดไฟ LED ให้ใหม่เรียบร้อยแล้ว'),
(3, 3, 7, 'น้ำหยดใต้ซิงค์ล้างจาน', 'มีน้ำซึมหยดใต้ท่อน้ำทิ้งซิงค์ล้างจาน', 'ประปา', 'medium', 'pending', NULL);

-- ------------------------------------------------------------
-- 6. ตารางประกาศข่าวสาร (announcements)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `author_id` INT NOT NULL,
  `priority` ENUM('normal', 'urgent') NOT NULL DEFAULT 'normal',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_announcements_author` (`author_id`),
  CONSTRAINT `fk_announcements_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลตัวอย่างประกาศ
INSERT INTO `announcements` (`id`, `title`, `content`, `author_id`, `priority`) VALUES
(1, 'แจ้งกำหนดการชำระค่าเช่าประจำเดือนกันยายน 2026', 'ขอให้นักศึกษาทุกห้องชำระค่าเช่าภายในวันที่ 5 ของเดือน หากชำระเกินกำหนดจะมีค่าปรับวันละ 50 บาท ขอบคุณครับ', 5, 'urgent'),
(2, 'แจ้งปิดปรับปรุงระบบน้ำประปาชั่วคราว', 'ในวันอาทิตย์ที่ 20 กันยายน เวลา 09:00 - 12:00 น. จะมีการล้างถังพักน้ำ ขอให้สำรองน้ำไว้ใช้', 5, 'normal'),
(3, 'ต้อนรับนักศึกษาใหม่ภาคเรียนที่ 1/2026', 'ยินดีต้อนรับนักศึกษาใหม่ทุกท่าน หากพบปัญหาการใช้งานห้องพัก สามารถแจ้งซ่อมผ่านระบบออนไลน์ได้ตลอด 24 ชม.', 5, 'normal');

SET FOREIGN_KEY_CHECKS = 1;
