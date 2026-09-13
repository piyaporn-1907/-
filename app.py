from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from database import get_db, init_db, DB_PATH

app = Flask(__name__)
CORS(app)

# Initialize database on startup if not exists
if not os.path.exists(DB_PATH):
    try:
        init_db()
    except Exception as e:
        print("Init DB error:", e)

def dict_from_row(row):
    return dict(row) if row else None

def dict_from_rows(rows):
    return [dict(r) for r in rows]

# ============================================================
# Routes & API Endpoints
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')

# ------------------------------------------------------------
# 1. Dashboard Stats (Owner / Caretaker Overview)
# ------------------------------------------------------------
@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    # Rooms breakdown
    cursor.execute("SELECT status, COUNT(*) as count FROM rooms GROUP BY status")
    room_stats = {row['status']: row['count'] for row in cursor.fetchall()}
    total_rooms = sum(room_stats.values())
    available_rooms = room_stats.get('available', 0)
    occupied_rooms = room_stats.get('occupied', 0)
    maintenance_rooms = room_stats.get('maintenance', 0)
    reserved_rooms = room_stats.get('reserved', 0)

    # Revenue breakdown (This Month 2026-09)
    cursor.execute("SELECT SUM(total_amount) as total_paid FROM rent_bills WHERE status = 'paid' AND month_year = '2026-09'")
    paid_row = cursor.fetchone()
    monthly_revenue = paid_row['total_paid'] if paid_row and paid_row['total_paid'] else 0.0

    cursor.execute("SELECT SUM(total_amount) as total_pending FROM rent_bills WHERE status IN ('unpaid', 'pending_verification') AND month_year = '2026-09'")
    pending_row = cursor.fetchone()
    pending_revenue = pending_row['total_pending'] if pending_row and pending_row['total_pending'] else 0.0

    # Repair stats
    cursor.execute("SELECT COUNT(*) as pending_repairs FROM repairs WHERE status IN ('pending', 'in_progress')")
    pending_repairs = cursor.fetchone()['pending_repairs']

    # Booking stats
    cursor.execute("SELECT COUNT(*) as pending_bookings FROM bookings WHERE status = 'pending'")
    pending_bookings = cursor.fetchone()['pending_bookings']

    conn.close()

    occupancy_rate = round((occupied_rooms / total_rooms * 100), 1) if total_rooms > 0 else 0

    return jsonify({
        'total_rooms': total_rooms,
        'available_rooms': available_rooms,
        'occupied_rooms': occupied_rooms,
        'maintenance_rooms': maintenance_rooms,
        'reserved_rooms': reserved_rooms,
        'occupancy_rate': occupancy_rate,
        'monthly_revenue': monthly_revenue,
        'pending_revenue': pending_revenue,
        'pending_repairs': pending_repairs,
        'pending_bookings': pending_bookings
    })

# ------------------------------------------------------------
# 2. Rooms API
# ------------------------------------------------------------
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    status = request.args.get('status')
    floor = request.args.get('floor')
    room_type = request.args.get('type')

    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM rooms WHERE 1=1"
    params = []

    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)
    if floor and floor != 'all':
        query += " AND floor = ?"
        params.append(floor)
    if room_type and room_type != 'all':
        query += " AND room_type LIKE ?"
        params.append(f"%{room_type}%")

    query += " ORDER BY room_number ASC"
    cursor.execute(query, params)
    rooms = dict_from_rows(cursor.fetchall())
    conn.close()
    return jsonify(rooms)

@app.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO rooms (room_number, floor, room_type, price_per_month, deposit, status, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['room_number'], data['floor'], data['room_type'],
            data['price_per_month'], data['deposit'], data.get('status', 'available'),
            data.get('description', ''), data.get('image_url', '')
        ))
        conn.commit()
        room_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': 'สร้างข้อมูลห้องพักเรียบร้อยแล้ว', 'room_id': room_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'หมายเลขห้องพักนี้มีในระบบแล้ว'}), 400

@app.route('/api/rooms/<int:room_id>', methods=['PUT'])
def update_room(room_id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE rooms
        SET status = ?, price_per_month = ?, description = ?
        WHERE id = ?
    ''', (data.get('status'), data.get('price_per_month'), data.get('description'), room_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'อัปเดตข้อมูลห้องพักเรียบร้อยแล้ว'})

# ------------------------------------------------------------
# 3. Bookings API
# ------------------------------------------------------------
@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    student_id = request.args.get('student_id')
    conn = get_db()
    cursor = conn.cursor()
    
    query = '''
        SELECT b.*, u.full_name as student_name, u.phone as student_phone, r.room_number, r.room_type, r.price_per_month
        FROM bookings b
        JOIN users u ON b.student_id = u.id
        JOIN rooms r ON b.room_id = r.id
        WHERE 1=1
    '''
    params = []
    if student_id:
        query += " AND b.student_id = ?"
        params.append(student_id)
    
    query += " ORDER BY b.created_at DESC"
    cursor.execute(query, params)
    bookings = dict_from_rows(cursor.fetchall())
    conn.close()
    return jsonify(bookings)

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    # Check room availability
    cursor.execute("SELECT status FROM rooms WHERE id = ?", (data['room_id'],))
    room = cursor.fetchone()
    if not room or room['status'] != 'available':
        conn.close()
        return jsonify({'error': 'ห้องพักนี้ไม่ว่างสำหรับจอง'}), 400

    cursor.execute('''
        INSERT INTO bookings (student_id, room_id, move_in_date, status, note)
        VALUES (?, ?, ?, 'pending', ?)
    ''', (data['student_id'], data['room_id'], data['move_in_date'], data.get('note', '')))
    
    # Mark room as reserved temporarily
    cursor.execute("UPDATE rooms SET status = 'reserved' WHERE id = ?", (data['room_id'],))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'ส่งคำร้องขอจองห้องพักเรียบร้อยแล้ว'}), 201

@app.route('/api/bookings/<int:booking_id>', methods=['PUT'])
def update_booking_status(booking_id):
    data = request.json
    new_status = data['status'] # 'approved' or 'rejected'
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT student_id, room_id FROM bookings WHERE id = ?", (booking_id,))
    booking = cursor.fetchone()
    if not booking:
        conn.close()
        return jsonify({'error': 'ไม่พบคำร้องจองห้องพัก'}), 404

    cursor.execute("UPDATE bookings SET status = ? WHERE id = ?", (new_status, booking_id))
    
    if new_status == 'approved':
        cursor.execute("UPDATE rooms SET status = 'occupied' WHERE id = ?", (booking['room_id'],))
        cursor.execute("UPDATE users SET room_id = ? WHERE id = ?", (booking['room_id'], booking['student_id']))
    elif new_status == 'rejected':
        cursor.execute("UPDATE rooms SET status = 'available' WHERE id = ?", (booking['room_id'],))

    conn.commit()
    conn.close()
    return jsonify({'message': f'ทำรายการ {new_status} เรียบร้อยแล้ว'})

# ------------------------------------------------------------
# 4. Repairs API
# ------------------------------------------------------------
@app.route('/api/repairs', methods=['GET'])
def get_repairs():
    student_id = request.args.get('student_id')
    conn = get_db()
    cursor = conn.cursor()
    
    query = '''
        SELECT rep.*, u.full_name as student_name, u.phone as student_phone, r.room_number
        FROM repairs rep
        JOIN users u ON rep.student_id = u.id
        JOIN rooms r ON rep.room_id = r.id
        WHERE 1=1
    '''
    params = []
    if student_id:
        query += " AND rep.student_id = ?"
        params.append(student_id)
        
    query += " ORDER BY rep.reported_at DESC"
    cursor.execute(query, params)
    repairs = dict_from_rows(cursor.fetchall())
    conn.close()
    return jsonify(repairs)

@app.route('/api/repairs', methods=['POST'])
def create_repair():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    # Get room_id for the student if not explicitly passed
    cursor.execute("SELECT room_id FROM users WHERE id = ?", (data['student_id'],))
    user = cursor.fetchone()
    room_id = data.get('room_id') or (user['room_id'] if user else None)
    
    if not room_id:
        cursor.execute("SELECT id FROM rooms LIMIT 1")
        first_room = cursor.fetchone()
        room_id = first_room['id'] if first_room else 1

    cursor.execute('''
        INSERT INTO repairs (student_id, room_id, title, description, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    ''', (data['student_id'], room_id, data['title'], data['description'], data['category'], data.get('priority', 'medium')))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'แจ้งซ่อมเรียบร้อยแล้ว'}), 201

@app.route('/api/repairs/<int:repair_id>', methods=['PUT'])
def update_repair(repair_id):
    data = request.json
    new_status = data['status']
    admin_note = data.get('admin_note', '')
    
    conn = get_db()
    cursor = conn.cursor()
    
    if new_status == 'completed':
        cursor.execute('''
            UPDATE repairs
            SET status = ?, admin_note = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_status, admin_note, repair_id))
    else:
        cursor.execute('''
            UPDATE repairs
            SET status = ?, admin_note = ?
            WHERE id = ?
        ''', (new_status, admin_note, repair_id))
        
    conn.commit()
    conn.close()
    return jsonify({'message': 'อัปเดตสถานะการแจ้งซ่อมเรียบร้อยแล้ว'})

# ------------------------------------------------------------
# 5. Rent Bills & Payments API
# ------------------------------------------------------------
@app.route('/api/bills', methods=['GET'])
def get_bills():
    student_id = request.args.get('student_id')
    status = request.args.get('status')
    
    conn = get_db()
    cursor = conn.cursor()
    
    query = '''
        SELECT b.*, u.full_name as student_name, r.room_number
        FROM rent_bills b
        JOIN users u ON b.student_id = u.id
        JOIN rooms r ON b.room_id = r.id
        WHERE 1=1
    '''
    params = []
    if student_id:
        query += " AND b.student_id = ?"
        params.append(student_id)
    if status and status != 'all':
        query += " AND b.status = ?"
        params.append(status)
        
    query += " ORDER BY b.month_year DESC"
    cursor.execute(query, params)
    bills = dict_from_rows(cursor.fetchall())
    conn.close()
    return jsonify(bills)

@app.route('/api/bills/pay/<int:bill_id>', methods=['POST'])
def pay_bill(bill_id):
    data = request.json
    slip_url = data.get('slip_url', 'https://via.placeholder.com/400x600/3b82f6/ffffff?text=Slip+Payment+Uploaded')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE rent_bills
        SET status = 'pending_verification', slip_url = ?, paid_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (slip_url, bill_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว รอผู้ดูแลตรวจสอบ'})

@app.route('/api/bills/verify/<int:bill_id>', methods=['PUT'])
def verify_bill(bill_id):
    data = request.json
    admin_id = data.get('admin_id', 5)
    action = data.get('action', 'approve') # 'approve' or 'reject'
    
    conn = get_db()
    cursor = conn.cursor()
    
    if action == 'approve':
        cursor.execute('''
            UPDATE rent_bills
            SET status = 'paid', verified_by = ?
            WHERE id = ?
        ''', (admin_id, bill_id))
    else:
        cursor.execute('''
            UPDATE rent_bills
            SET status = 'unpaid', slip_url = NULL
            WHERE id = ?
        ''', (bill_id,))
        
    conn.commit()
    conn.close()
    return jsonify({'message': 'ยืนยันการตรวจสอบเรียบร้อยแล้ว'})

# ------------------------------------------------------------
# 6. Announcements API
# ------------------------------------------------------------
@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.*, u.full_name as author_name
        FROM announcements a
        JOIN users u ON a.author_id = u.id
        ORDER BY a.created_at DESC
    ''')
    items = dict_from_rows(cursor.fetchall())
    conn.close()
    return jsonify(items)

@app.route('/api/announcements', methods=['POST'])
def create_announcement():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO announcements (title, content, author_id, priority)
        VALUES (?, ?, ?, ?)
    ''', (data['title'], data['content'], data.get('author_id', 5), data.get('priority', 'normal')))
    conn.commit()
    conn.close()
    return jsonify({'message': 'ลงประกาศเรียบร้อยแล้ว'}), 201

# ------------------------------------------------------------
# 7. Users API (Demo Role Selection)
# ------------------------------------------------------------
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.id, u.username, u.full_name, u.student_id, u.phone, u.role, u.room_id, r.room_number
        FROM users u
        LEFT JOIN rooms r ON u.room_id = r.id
        ORDER BY u.id ASC
    ''')
    users = dict_from_rows(cursor.fetchall())
    conn.close()
    return jsonify(users)

if __name__ == '__main__':
    print("[INFO] Starting Student Dormitory Management System Server...")
    print("[INFO] Access Web Interface at: http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
