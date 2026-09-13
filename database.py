import sqlite3
import os
import shutil

USE_MYSQL = False
MYSQL_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '12345678', # AppServ default password
    'database': 'dormitory',
    'charset': 'utf8mb4'
}

# Try connecting to AppServ MySQL locally
try:
    import pymysql
    try:
        # Test connection to MySQL AppServ
        test_conn = pymysql.connect(
            host=MYSQL_CONFIG['host'],
            port=MYSQL_CONFIG['port'],
            user=MYSQL_CONFIG['user'],
            password=MYSQL_CONFIG['password'],
            charset=MYSQL_CONFIG['charset'],
            autocommit=True
        )
        with test_conn.cursor() as cur:
            cur.execute("CREATE DATABASE IF NOT EXISTS `dormitory` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        test_conn.select_db(MYSQL_CONFIG['database'])
        test_conn.close()
        USE_MYSQL = True
        print("[OK] Connected to AppServ MySQL database ('dormitory') successfully.")
    except Exception as err:
        print("[INFO] AppServ MySQL not reachable, using SQLite fallback:", err)
        USE_MYSQL = False
except ImportError:
    USE_MYSQL = False

# Fallback SQLite config for Vercel / serverless
DB_ORIGINAL_PATH = os.path.join(os.path.dirname(__file__), 'dormitory.db')

if os.environ.get('VERCEL') or not os.access(os.path.dirname(__file__), os.W_OK):
    TMP_DIR = '/tmp'
    DB_PATH = os.path.join(TMP_DIR, 'dormitory.db')
    if not os.path.exists(DB_PATH) and os.path.exists(DB_ORIGINAL_PATH):
        try:
            shutil.copyfile(DB_ORIGINAL_PATH, DB_PATH)
        except Exception as e:
            print("DB Copy Warning:", e)
else:
    DB_PATH = DB_ORIGINAL_PATH


class MySQLCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor
        self.lastrowid = None

    def execute(self, sql, params=()):
        sql_mysql = sql.replace('?', '%s')
        res = self.cursor.execute(sql_mysql, params)
        self.lastrowid = self.cursor.lastrowid
        return res

    def executemany(self, sql, params_list):
        sql_mysql = sql.replace('?', '%s')
        return self.cursor.executemany(sql_mysql, params_list)

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()


class MySQLConnWrapper:
    def __init__(self, conn):
        self.conn = conn

    def cursor(self):
        return MySQLCursorWrapper(self.conn.cursor(pymysql.cursors.DictCursor))

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def executescript(self, script):
        with self.conn.cursor() as cursor:
            for statement in script.split(';'):
                stmt = statement.strip()
                if stmt:
                    try:
                        cursor.execute(stmt)
                    except Exception:
                        pass


def get_db():
    if USE_MYSQL:
        try:
            conn = pymysql.connect(
                host=MYSQL_CONFIG['host'],
                port=MYSQL_CONFIG['port'],
                user=MYSQL_CONFIG['user'],
                password=MYSQL_CONFIG['password'],
                database=MYSQL_CONFIG['database'],
                charset=MYSQL_CONFIG['charset'],
                autocommit=True
            )
            return MySQLConnWrapper(conn)
        except Exception as e:
            print("[WARN] AppServ MySQL error, using SQLite:", e)
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn


def init_db():
    if USE_MYSQL:
        schema_path = os.path.join(os.path.dirname(__file__), 'appserv_dormitory.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()

        conn = get_db()
        conn.executescript(schema_sql)
        conn.close()
        print("[OK] AppServ MySQL Schema initialized successfully.")
    else:
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()

        conn = get_db()
        cursor = conn.cursor()
        cursor.executescript(schema_sql)
        conn.commit()
        conn.close()
        print("[OK] Database schema initialized successfully.")
        seed_db()


def seed_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    row = cursor.fetchone()
    count = list(row.values())[0] if isinstance(row, dict) else row[0]
    if count > 0:
        conn.close()
        return

    print("[INFO] Seeding initial data...")

    rooms_data = [
        ('101', 1, 'ห้องเดี่ยว Standard', 4500.00, 5000.00, 'available', 'เตียงเดี่ยว 3.5 ฟุต, โต๊ะอ่านหนังสือ, ตู้เสื้อผ้า, เครื่องปรับอากาศ, ระเบียง', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'),
        ('102', 1, 'ห้องเดี่ยว Standard', 4500.00, 5000.00, 'occupied', 'เตียงเดี่ยว 3.5 ฟุต, โต๊ะอ่านหนังสือ, ตู้เสื้อผ้า, เครื่องปรับอากาศ, ระเบียง', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80'),
        ('103', 1, 'ห้องคู่ Deluxe', 5500.00, 6000.00, 'available', 'เตียงคู่ 3.5 ฟุต x 2, โต๊ะทำงานคู่, ตู้เสื้อผ้าใหญ่, เครื่องปรับอากาศ, ตู้เย็น, ไมโครเวฟ', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80'),
        ('104', 1, 'ห้องคู่ Deluxe', 5500.00, 6000.00, 'maintenance', 'เตียงคู่ 3.5 ฟุต x 2, โต๊ะทำงานคู่, ตู้เสื้อผ้าใหญ่, เครื่องปรับอากาศ (กำลังซ่อม)', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'),
        ('201', 2, 'ห้องเดี่ยว Standard', 4700.00, 5000.00, 'occupied', 'ชั้น 2 วิวสวน, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, สมาร์ททีวี', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80'),
        ('202', 2, 'ห้องเดี่ยว Standard', 4700.00, 5000.00, 'available', 'ชั้น 2 วิวสวน, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, ตู้เสื้อผ้าใหญ่', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80'),
        ('203', 2, 'ห้อง VIP Suite', 6500.00, 7000.00, 'occupied', 'ชั้น 2 ห้องมุม กว้างพิเศษ, เตียง 6 ฟุต, โซฟาชุดรับแขก, โต๊ะทำงาน, ตู้เย็นใหญ่', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80'),
        ('204', 2, 'ห้อง VIP Suite', 6500.00, 7000.00, 'available', 'ชั้น 2 ห้องมุม กว้างพิเศษ, เตียง 6 ฟุต, โซฟาชุดรับแขก, โต๊ะทำงาน, ตู้เย็นใหญ่', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80'),
        ('301', 3, 'ห้องเดี่ยว Standard', 4800.00, 5000.00, 'reserved', 'ชั้น 3 เงียบสงบ, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, โต๊ะอ่านหนังสือ', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=600&q=80'),
        ('302', 3, 'ห้องเดี่ยว Standard', 4800.00, 5000.00, 'available', 'ชั้น 3 เงียบสงบ, เตียง 5 ฟุต, แอร์, เครื่องทำน้ำอุ่น, โต๊ะอ่านหนังสือ', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80')
    ]
    cursor.executemany('''
        INSERT INTO rooms (room_number, floor, room_type, price_per_month, deposit, status, description, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', rooms_data)

    users_data = [
        ('somchai', 'pass123', 'สมชาย ใจดี', '650100123', '081-234-5678', 'somchai@std.university.ac.th', 'student', 2),
        ('suda', 'pass123', 'สุดา รักเรียน', '650100456', '082-345-6789', 'suda@std.university.ac.th', 'student', 5),
        ('ananya', 'pass123', 'อนัญญ์ รุ่งเรือง', '660100789', '083-456-7890', 'ananya@std.university.ac.th', 'student', 7),
        ('wichai', 'pass123', 'วิชัย ขยันเรียน', '660100999', '084-567-8901', 'wichai@std.university.ac.th', 'student', None),
        ('admin1', 'admin123', 'คุณปิยาภรณ์ ผู้ดูแลหอ', None, '089-111-2222', 'caretaker@dorm.com', 'admin', None),
        ('owner1', 'owner123', 'คุณดารานี เจ้าของหอพัก', None, '089-999-8888', 'owner@dorm.com', 'owner', None)
    ]
    cursor.executemany('''
        INSERT INTO users (username, password_hash, full_name, student_id, phone, email, role, room_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', users_data)

    bookings_data = [
        (4, 9, '2026-10-01', 'pending', 'ขอห้องเงียบสงบ สำหรับอ่านหนังสือเตรียมสอบ'),
        (1, 2, '2026-06-01', 'approved', 'ย้ายเข้าต้นเทอม 1'),
        (2, 5, '2026-06-01', 'approved', 'ย้ายเข้าต้นเทอม 1')
    ]
    cursor.executemany('''
        INSERT INTO bookings (student_id, room_id, move_in_date, status, note)
        VALUES (?, ?, ?, ?, ?)
    ''', bookings_data)

    bills_data = [
        (1, 2, '2026-09', 4500.00, 180.00, 450.00, 5130.00, '2026-09-05', 'pending_verification', 'https://via.placeholder.com/400x600/3b82f6/ffffff?text=Slip+Transfer+5130.00+THB', '2026-09-03 10:15:00'),
        (1, 2, '2026-08', 4500.00, 160.00, 420.00, 5080.00, '2026-08-05', 'paid', 'https://via.placeholder.com/400x600/10b981/ffffff?text=Slip+August+Paid', '2026-08-04 14:20:00'),
        (2, 5, '2026-09', 4700.00, 200.00, 510.00, 5410.00, '2026-09-05', 'paid', 'https://via.placeholder.com/400x600/10b981/ffffff?text=Slip+September+Paid', '2026-09-02 09:30:00'),
        (2, 5, '2026-08', 4700.00, 190.00, 480.00, 5370.00, '2026-08-05', 'paid', 'https://via.placeholder.com/400x600/10b981/ffffff?text=Slip+August+Paid', '2026-08-03 11:00:00'),
        (3, 7, '2026-09', 6500.00, 250.00, 720.00, 7470.00, '2026-09-05', 'unpaid', None, None)
    ]
    cursor.executemany('''
        INSERT INTO rent_bills (student_id, room_id, month_year, room_fee, water_fee, electricity_fee, total_amount, due_date, status, slip_url, paid_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', bills_data)

    repairs_data = [
        (1, 2, 'เครื่องปรับอากาศเย็นน้อย มีเสียงดัง', 'แอร์ห้อง 102 มีเสียงดังกวนเวลานอน และเย็นช้ากว่าปกติ', 'เครื่องปรับอากาศ', 'high', 'in_progress', 'ช่างจะเข้าดูวันเสาร์ช่วงบ่าย 14:00 น.'),
        (2, 5, 'หลอดไฟระเบียงดับ', 'หลอดไฟตรงระเบียงหลังห้อง 201 ขาด ต้องการให้เปลี่ยนหลอดใหม่', 'ไฟฟ้า', 'low', 'completed', 'ผู้ดูแลเปลี่ยนหลอดไฟ LED ให้ใหม่เรียบร้อยแล้ว'),
        (3, 7, 'น้ำหยดใต้ซิงค์ล้างจาน', 'มีน้ำซึมหยดใต้ท่อน้ำทิ้งซิงค์ล้างจาน', 'ประปา', 'medium', 'pending', None)
    ]
    cursor.executemany('''
        INSERT INTO repairs (student_id, room_id, title, description, category, priority, status, admin_note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', repairs_data)

    announcements_data = [
        ('แจ้งกำหนดการชำระค่าเช่าประจำเดือนกันยายน 2026', 'ขอให้นักศึกษาทุกห้องชำระค่าเช่าภายในวันที่ 5 ของเดือน หากชำระเกินกำหนดจะมีค่าปรับวันละ 50 บาท ขอบคุณครับ', 5, 'urgent'),
        ('แจ้งปิดปรับปรุงระบบน้ำประปาชั่วคราว', 'ในวันอาทิตย์ที่ 20 กันยายน เวลา 09:00 - 12:00 น. จะมีการล้างถังพักน้ำ ขอให้สำรองน้ำไว้ใช้', 5, 'normal'),
        ('ต้อนรับนักศึกษาใหม่ภาคเรียนที่ 1/2026', 'ยินดีต้อนรับนักศึกษาใหม่ทุกท่าน หากพบปัญหาการใช้งานห้องพัก สามารถแจ้งซ่อมผ่านระบบออนไลน์ได้ตลอด 24 ชม.', 5, 'normal')
    ]
    cursor.executemany('''
        INSERT INTO announcements (title, content, author_id, priority)
        VALUES (?, ?, ?, ?)
    ''', announcements_data)

    conn.commit()
    conn.close()
    print("[OK] Initial seed data created successfully.")


if __name__ == '__main__':
    init_db()
