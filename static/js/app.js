/* ============================================================
   ระบบจัดการหอพักนักศึกษา - Student Dormitory Management System
   Frontend Interactive SPA Controller JavaScript (Aesthetic Edition)
   ============================================================ */

let currentUser = {
    id: 5,
    username: 'admin1',
    full_name: 'คุณสมศักดิ์ ผู้ดูแลหอ',
    role: 'admin',
    room_id: null
};

let usersList = [];
let revenueChart = null;

// Initial Setup on Page Load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadStats();
    loadRooms();
    loadAnnouncements();
    initChart();
});

// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ------------------------------------------------------------
// User & Role Switcher Logic
// ------------------------------------------------------------
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        usersList = await res.json();
        const defaultUser = usersList.find(u => u.id === currentUser.id);
        if (defaultUser) {
            updateUserBanner(defaultUser);
        }
    } catch (err) {
        console.error("Failed to load users:", err);
    }
}

function switchRole(userId) {
    const user = usersList.find(u => u.id == userId);
    if (!user) return;
    
    currentUser = user;
    updateUserBanner(user);
    
    // Refresh all tables & dashboards based on new role context
    loadStats();
    loadRooms();
    loadRepairs();
    loadBills();
    loadBookings();
    
    // Auto switch to appropriate tab
    const ownerSection = document.getElementById('ownerRevenueSection');
    if (ownerSection) {
        ownerSection.style.display = user.role === 'owner' ? 'block' : 'none';
    }

    showToast(`สลับบทบาทเป็น: ${user.full_name} (${getRoleTitle(user.role)})`, 'success');
}

function updateUserBanner(user) {
    document.getElementById('bannerUserName').innerText = `${user.full_name}`;
    document.getElementById('bannerUserDetail').innerHTML = `<i class="fa-solid fa-id-badge"></i> ${getRoleTitle(user.role)} ${user.room_number ? ' | <i class="fa-solid fa-door-open"></i> ห้องพัก: ' + user.room_number : ''} | <i class="fa-solid fa-phone"></i> ${user.phone}`;
    
    const badge = document.getElementById('bannerRoleBadge');
    badge.className = `badge-role ${user.role}`;
    badge.innerHTML = `<i class="fa-solid ${user.role === 'student' ? 'fa-user-graduate' : (user.role === 'admin' ? 'fa-user-shield' : 'fa-crown')}"></i> ${getRoleTitle(user.role)}`;

    // Toggle Role-specific UI buttons
    const isAdminOrOwner = user.role === 'admin' || user.role === 'owner';
    const btnAddRoom = document.getElementById('btnAdminAddRoom');
    const btnAnnounce = document.getElementById('btnAdminAnnouncement');
    const btnPostAnnounce = document.getElementById('btnPostAnnouncement');
    const tabBookings = document.getElementById('tabBookings');
    const ownerRevenueSection = document.getElementById('ownerRevenueSection');

    if (btnAddRoom) btnAddRoom.style.display = isAdminOrOwner ? 'inline-flex' : 'none';
    if (btnAnnounce) btnAnnounce.style.display = isAdminOrOwner ? 'inline-flex' : 'none';
    if (btnPostAnnounce) btnPostAnnounce.style.display = isAdminOrOwner ? 'inline-flex' : 'none';
    if (tabBookings) tabBookings.style.display = isAdminOrOwner ? 'inline-flex' : 'none';
    if (ownerRevenueSection) ownerRevenueSection.style.display = user.role === 'owner' ? 'block' : 'none';
}

function getRoleTitle(role) {
    switch(role) {
        case 'student': return 'นักศึกษา (ผู้พักอาศัย)';
        case 'admin': return 'ผู้ดูแลหอพัก';
        case 'owner': return 'เจ้าของหอพัก';
        default: return role;
    }
}

// ------------------------------------------------------------
// Navigation Tabs Switcher
// ------------------------------------------------------------
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

    // Trigger tab specific data refresh
    if (tabId === 'rooms') loadRooms();
    if (tabId === 'repairs') loadRepairs();
    if (tabId === 'bills') loadBills();
    if (tabId === 'bookings') loadBookings();
    if (tabId === 'announcements') loadAnnouncements();
    if (tabId === 'dashboard') loadStats();
}

// ------------------------------------------------------------
// 1. Dashboard Stats & Chart
// ------------------------------------------------------------
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('statTotalRooms').innerText = data.total_rooms;
        document.getElementById('statAvailableRooms').innerText = data.available_rooms;
        document.getElementById('statOccupiedRooms').innerText = data.occupied_rooms;
        document.getElementById('statPendingRepairs').innerText = data.pending_repairs;
        
        document.getElementById('statMonthlyRevenue').innerText = `฿${data.monthly_revenue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;
        document.getElementById('statPendingRevenue').innerText = `฿${data.pending_revenue.toLocaleString('th-TH', {minimumFractionDigits: 2})}`;

        if (revenueChart) {
            revenueChart.data.datasets[0].data = [data.occupied_rooms, data.available_rooms, data.maintenance_rooms, data.reserved_rooms];
            revenueChart.update();
        }
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

function initChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    revenueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['มีผู้พักอาศัย (Occupied)', 'ห้องว่าง (Available)', 'กำลังซ่อม (Maintenance)', 'ติดจอง (Reserved)'],
            datasets: [{
                data: [3, 4, 1, 1],
                backgroundColor: ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Prompt', size: 12 } } },
                title: { display: true, text: 'สัดส่วนสถานะห้องพักทั้งหมด', font: { family: 'Prompt', size: 14, weight: 'bold' } }
            }
        }
    });
}

// ------------------------------------------------------------
// 2. Rooms Management & Booking
// ------------------------------------------------------------
async function loadRooms() {
    const status = document.getElementById('filterRoomStatus').value;
    const floor = document.getElementById('filterRoomFloor').value;
    
    try {
        const res = await fetch(`/api/rooms?status=${status}&floor=${floor}`);
        const rooms = await res.json();
        
        const container = document.getElementById('roomsContainer');
        container.innerHTML = '';

        if (rooms.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem; background: var(--bg-card); border-radius: var(--border-radius-md); border: 1px dashed var(--border-color);"><i class="fa-solid fa-door-closed" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i><br>ไม่พบข้อมูลห้องพักตรงตามเงื่อนไข</div>`;
            return;
        }

        rooms.forEach(room => {
            const isAvailable = room.status === 'available';
            const statusLabel = {
                'available': 'ห้องว่างพร้อมจอง',
                'occupied': 'มีผู้เข้าพักแล้ว',
                'maintenance': 'กำลังซ่อมแซม',
                'reserved': 'ติดจอง'
            }[room.status] || room.status;

            const cardHtml = `
                <div class="room-card">
                    <div class="room-img-container">
                        <img src="${room.image_url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}" class="room-img" alt="Room ${room.room_number}">
                        <span class="room-badge status-${room.status}">
                            <span class="status-dot"></span> ${statusLabel}
                        </span>
                    </div>
                    <div class="room-body">
                        <div class="room-header">
                            <div class="room-title">ห้อง ${room.room_number} (ชั้น ${room.floor})</div>
                            <div class="room-price">฿${room.price_per_month.toLocaleString()} <span>/เดือน</span></div>
                        </div>
                        <div class="room-type-tag"><i class="fa-solid fa-layer-group" style="color:var(--primary);"></i> ${room.room_type} | เงินประกัน ฿${room.deposit.toLocaleString()}</div>
                        <div class="room-desc">${room.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</div>
                        <div>
                            ${isAvailable && currentUser.role === 'student' ? `
                                <button class="btn btn-primary" style="width:100%;" onclick="openBookingModal(${room.id}, '${room.room_number}', ${room.price_per_month})">
                                    <i class="fa-solid fa-calendar-plus"></i> จองห้องพักนี้
                                </button>
                            ` : `
                                <button class="btn btn-outline" style="width:100%;" disabled>
                                    ${isAvailable ? 'ห้องว่าง (สลับเป็นนักศึกษาเพื่อจอง)' : statusLabel}
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHtml);
        });
    } catch (err) {
        console.error("Error loading rooms:", err);
    }
}

function openBookingModal(roomId, roomNumber, price) {
    document.getElementById('bookRoomId').value = roomId;
    document.getElementById('bookRoomNumber').value = `ห้อง ${roomNumber}`;
    document.getElementById('bookRoomPrice').value = `฿${price.toLocaleString()} บาท/เดือน`;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('bookMoveInDate').value = tomorrow.toISOString().split('T')[0];
    
    openModal('modalBooking');
}

async function submitBooking(event) {
    event.preventDefault();
    const roomId = document.getElementById('bookRoomId').value;
    const moveInDate = document.getElementById('bookMoveInDate').value;
    const note = document.getElementById('bookNote').value;

    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                student_id: currentUser.id,
                room_id: roomId,
                move_in_date: moveInDate,
                note: note
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            closeModal('modalBooking');
            loadRooms();
            loadStats();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("เกิดข้อผิดพลาดในการจองห้องพัก", 'error');
    }
}

// ------------------------------------------------------------
// 3. Repairs Management
// ------------------------------------------------------------
async function loadRepairs() {
    try {
        const url = currentUser.role === 'student' ? `/api/repairs?student_id=${currentUser.id}` : '/api/repairs';
        const res = await fetch(url);
        const repairs = await res.json();

        const tbody = document.getElementById('repairsTableBody');
        tbody.innerHTML = '';

        if (repairs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted); padding:3rem;">ไม่มีรายการแจ้งซ่อม</td></tr>`;
            return;
        }

        repairs.forEach(r => {
            const statusBadge = {
                'pending': '<span class="badge badge-pending"><i class="fa-solid fa-clock"></i> รอดำเนินการ</span>',
                'in_progress': '<span class="badge badge-in_progress"><i class="fa-solid fa-spinner fa-spin"></i> กำลังซ่อมแซม</span>',
                'completed': '<span class="badge badge-completed"><i class="fa-solid fa-check-circle"></i> ซ่อมแซมเสร็จสิ้น</span>'
            }[r.status] || r.status;

            const priorityBadge = {
                'low': '<span style="color:var(--secondary); font-size:0.85rem;">ปกติ</span>',
                'medium': '<span style="color:var(--info); font-size:0.85rem; font-weight:600;">ปานกลาง</span>',
                'high': '<span style="color:var(--warning); font-size:0.85rem; font-weight:700;">ด่วน</span>',
                'urgent': '<span style="color:var(--danger); font-size:0.85rem; font-weight:700;">ด่วนที่สุด</span>'
            }[r.priority] || r.priority;

            const row = `
                <tr>
                    <td>#REP-${r.id}</td>
                    <td><b>ห้อง ${r.room_number}</b><br><small style="color:var(--text-muted);">${r.student_name}</small></td>
                    <td><b>${r.title}</b><br><small style="color:var(--text-muted);">${r.description}</small></td>
                    <td>${r.category}</td>
                    <td>${priorityBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${r.admin_note || '-'}</td>
                    <td><small>${new Date(r.reported_at).toLocaleDateString('th-TH')}</small></td>
                    <td>
                        ${(currentUser.role === 'admin' || currentUser.role === 'owner') && r.status !== 'completed' ? `
                            <button class="btn btn-sm btn-success" style="padding:0.35rem 0.75rem; font-size:0.82rem;" onclick="updateRepairStatus(${r.id}, 'completed')">
                                <i class="fa-solid fa-check"></i> เสร็จสิ้น
                            </button>
                            <button class="btn btn-sm btn-warning" style="padding:0.35rem 0.75rem; font-size:0.82rem;" onclick="updateRepairStatus(${r.id}, 'in_progress')">
                                กำลังทำ
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (err) {
        console.error("Error loading repairs:", err);
    }
}

function openNewRepairModal() {
    openModal('modalRepair');
}

async function submitRepair(event) {
    event.preventDefault();
    const title = document.getElementById('repairTitle').value;
    const category = document.getElementById('repairCategory').value;
    const priority = document.getElementById('repairPriority').value;
    const desc = document.getElementById('repairDesc').value;

    try {
        const res = await fetch('/api/repairs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                student_id: currentUser.id,
                room_id: currentUser.room_id,
                title: title,
                category: category,
                priority: priority,
                description: desc
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            closeModal('modalRepair');
            loadRepairs();
            loadStats();
        } else {
            showToast(data.error, 'error');
        }
    } catch (err) {
        console.error(err);
    }
}

async function updateRepairStatus(repairId, status) {
    const note = prompt("ระบุบันทึกผู้ดูแลเพิ่มเติม (ถ้ามี):", status === 'completed' ? 'ช่างได้ดำเนินการซ่อมแซมเรียบร้อยแล้ว' : 'ช่างกำลังเข้าตรวจสอบ');
    try {
        const res = await fetch(`/api/repairs/${repairId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: status, admin_note: note })
        });
        const data = await res.json();
        showToast(data.message, 'success');
        loadRepairs();
        loadStats();
    } catch (err) {
        console.error(err);
    }
}

// ------------------------------------------------------------
// 4. Bills & Payment Management
// ------------------------------------------------------------
async function loadBills() {
    const status = document.getElementById('filterBillStatus').value;
    try {
        const url = currentUser.role === 'student' ? `/api/bills?student_id=${currentUser.id}&status=${status}` : `/api/bills?status=${status}`;
        const res = await fetch(url);
        const bills = await res.json();

        const tbody = document.getElementById('billsTableBody');
        tbody.innerHTML = '';

        if (bills.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: var(--text-muted); padding:3rem;">ไม่มีรายการบิลค่าเช่า</td></tr>`;
            return;
        }

        bills.forEach(b => {
            const statusBadge = {
                'unpaid': '<span class="badge badge-unpaid"><i class="fa-solid fa-triangle-exclamation"></i> ยังไม่ชำระ</span>',
                'pending_verification': '<span class="badge badge-pending_verification"><i class="fa-solid fa-spinner fa-spin"></i> รอตรวจสอบสลิป</span>',
                'paid': '<span class="badge badge-paid"><i class="fa-solid fa-circle-check"></i> ชำระแล้ว</span>'
            }[b.status] || b.status;

            const row = `
                <tr>
                    <td><b>รอบ ${b.month_year}</b></td>
                    <td>ห้อง ${b.room_number}</td>
                    <td>${b.student_name}</td>
                    <td>฿${b.room_fee.toLocaleString()}</td>
                    <td>น้ำ ฿${b.water_fee} / ไฟ ฿${b.electricity_fee}</td>
                    <td><b style="color:var(--primary); font-size:1.1rem;">฿${b.total_amount.toLocaleString()}</b></td>
                    <td><small>${b.due_date}</small></td>
                    <td>${statusBadge}</td>
                    <td>
                        ${b.slip_url ? `<a href="${b.slip_url}" target="_blank" class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.8rem;"><i class="fa-solid fa-image"></i> ดูสลิป</a>` : '-'}
                    </td>
                    <td>
                        ${currentUser.role === 'student' && b.status === 'unpaid' ? `
                            <button class="btn btn-sm btn-success" style="padding:0.35rem 0.75rem; font-size:0.82rem;" onclick="openPaymentModal(${b.id}, ${b.total_amount})">
                                <i class="fa-solid fa-upload"></i> แนบสลิป
                            </button>
                        ` : ''}

                        ${(currentUser.role === 'admin' || currentUser.role === 'owner') && b.status === 'pending_verification' ? `
                            <button class="btn btn-sm btn-success" style="padding:0.35rem 0.75rem; font-size:0.82rem;" onclick="verifyPayment(${b.id}, 'approve')">
                                <i class="fa-solid fa-check"></i> ยืนยันสลิป
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (err) {
        console.error("Error loading bills:", err);
    }
}

function openPaymentModal(billId, amount) {
    document.getElementById('payBillId').value = billId;
    document.getElementById('payTotalAmount').innerText = `ยอดชำระ: ฿${amount.toLocaleString()} บาท`;
    openModal('modalPay');
}

async function submitPayment(event) {
    event.preventDefault();
    const billId = document.getElementById('payBillId').value;
    const slipUrl = document.getElementById('paySlipUrl').value;

    try {
        const res = await fetch(`/api/bills/pay/${billId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ slip_url: slipUrl })
        });
        const data = await res.json();
        showToast(data.message, 'success');
        closeModal('modalPay');
        loadBills();
    } catch (err) {
        console.error(err);
    }
}

async function verifyPayment(billId, action) {
    try {
        const res = await fetch(`/api/bills/verify/${billId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: action, admin_id: currentUser.id })
        });
        const data = await res.json();
        showToast(data.message, 'success');
        loadBills();
        loadStats();
    } catch (err) {
        console.error(err);
    }
}

// ------------------------------------------------------------
// 5. Bookings Approval Management
// ------------------------------------------------------------
async function loadBookings() {
    try {
        const res = await fetch('/api/bookings');
        const bookings = await res.json();

        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted); padding:3rem;">ไม่มีคำร้องจองห้องพัก</td></tr>`;
            return;
        }

        bookings.forEach(bk => {
            const statusBadge = {
                'pending': '<span class="badge badge-pending">รอพิจารณา</span>',
                'approved': '<span class="badge badge-paid">อนุมัติแล้ว</span>',
                'rejected': '<span class="badge badge-unpaid">ปฏิเสธ</span>'
            }[bk.status] || bk.status;

            const row = `
                <tr>
                    <td>#BK-${bk.id}</td>
                    <td><b>${bk.student_name}</b></td>
                    <td>${bk.student_phone}</td>
                    <td><b>ห้อง ${bk.room_number}</b></td>
                    <td>${bk.room_type}</td>
                    <td>${bk.move_in_date}</td>
                    <td>${bk.note || '-'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        ${bk.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" style="padding:0.35rem 0.75rem; font-size:0.82rem;" onclick="processBooking(${bk.id}, 'approved')">
                                <i class="fa-solid fa-check"></i> อนุมัติ
                            </button>
                            <button class="btn btn-sm btn-danger" style="padding:0.35rem 0.75rem; font-size:0.82rem;" onclick="processBooking(${bk.id}, 'rejected')">
                                <i class="fa-solid fa-xmark"></i> ปฏิเสธ
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (err) {
        console.error("Error loading bookings:", err);
    }
}

async function processBooking(bookingId, status) {
    if (!confirm(`คุณต้องการ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} คำร้องจองนี้ใช่หรือไม่?`)) return;
    try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ status: status })
        });
        const data = await res.json();
        showToast(data.message, 'success');
        loadBookings();
        loadRooms();
        loadStats();
    } catch (err) {
        console.error(err);
    }
}

// ------------------------------------------------------------
// 6. Announcements
// ------------------------------------------------------------
async function loadAnnouncements() {
    try {
        const res = await fetch('/api/announcements');
        const items = await res.json();

        const container = document.getElementById('announcementsContainer');
        container.innerHTML = '';

        items.forEach(item => {
            const card = `
                <div class="announcement-card ${item.priority === 'urgent' ? 'urgent' : ''}">
                    <div class="announcement-header">
                        <div class="announcement-title">
                            ${item.priority === 'urgent' ? '<span class="badge badge-unpaid" style="margin-right:0.5rem;"><i class="fa-solid fa-triangle-exclamation"></i> ประกาศด่วน</span>' : ''}
                            ${item.title}
                        </div>
                        <div class="announcement-date"><i class="fa-regular fa-clock"></i> ${new Date(item.created_at).toLocaleString('th-TH')}</div>
                    </div>
                    <div style="font-size: 0.96rem; color: var(--text-dark); margin-top: 0.5rem;">${item.content}</div>
                    <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.6rem;"><i class="fa-solid fa-user-pen"></i> ประกาศโดย: ${item.author_name}</div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', card);
        });
    } catch (err) {
        console.error("Error loading announcements:", err);
    }
}

function openAnnouncementModal() {
    openModal('modalAnnounce');
}

async function submitAnnouncement(event) {
    event.preventDefault();
    const title = document.getElementById('announceTitle').value;
    const priority = document.getElementById('announcePriority').value;
    const content = document.getElementById('announceContent').value;

    try {
        const res = await fetch('/api/announcements', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                title: title,
                priority: priority,
                content: content,
                author_id: currentUser.id
            })
        });
        const data = await res.json();
        showToast(data.message, 'success');
        closeModal('modalAnnounce');
        loadAnnouncements();
    } catch (err) {
        console.error(err);
    }
}

// ------------------------------------------------------------
// Modal Helper Functions
// ------------------------------------------------------------
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
