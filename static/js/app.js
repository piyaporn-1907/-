/* ============================================================
   ระบบจัดการหอพักนักศึกษา - Student Dormitory Management System
   Frontend Interactive SPA Controller (Next-Gen Sidebar Edition)
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
        toast.style.transform = 'translateY(15px) scale(0.9)';
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
    
    const ownerSection = document.getElementById('ownerRevenueSection');
    if (ownerSection) {
        ownerSection.style.display = user.role === 'owner' ? 'block' : 'none';
    }

    showToast(`สลับสิทธิ์ผู้ใช้เป็น: ${user.full_name}`, 'success');
}

function updateUserBanner(user) {
    document.getElementById('bannerUserName').innerText = `${user.full_name}`;
    document.getElementById('welcomeGreeting').innerText = `ยินดีต้อนรับ! ${user.full_name} 👋`;
    document.getElementById('userAvatar').innerText = user.full_name.charAt(0);

    document.getElementById('bannerUserDetail').innerHTML = `
        <span><i class="fa-solid fa-id-badge"></i> ${getRoleTitle(user.role)}</span>
        ${user.room_number ? '<span> | <i class="fa-solid fa-door-open"></i> ห้อง: ' + user.room_number + '</span>' : ''}
        <span> | <i class="fa-solid fa-phone"></i> ${user.phone}</span>
    `;
    
    const badge = document.getElementById('bannerRoleBadge');
    badge.innerText = getRoleTitle(user.role);

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
    if (tabBookings) tabBookings.style.display = isAdminOrOwner ? 'flex' : 'none';
    if (ownerRevenueSection) ownerRevenueSection.style.display = user.role === 'owner' ? 'block' : 'none';
}

function getRoleTitle(role) {
    switch (role) {
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
    document.querySelectorAll('.sidebar-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.sidebar-link')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (activeBtn) activeBtn.classList.add('active');

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

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
        
        document.getElementById('statMonthlyRevenue').innerText = `฿${data.monthly_revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
        document.getElementById('statPendingRevenue').innerText = `฿${data.pending_revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

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
                backgroundColor: ['#f43f5e', '#10b981', '#f59e0b', '#6366f1'],
                borderWidth: 3,
                borderColor: '#0f172a'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { family: 'Prompt', size: 12 }, color: '#94a3b8' } },
                title: { display: true, text: 'สัดส่วนสถานะห้องพักทั้งหมด', font: { family: 'Prompt', size: 14, weight: 'bold' }, color: '#ffffff' }
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
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 4rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-glass);"><i class="fa-solid fa-door-closed" style="font-size:3.5rem; margin-bottom:1rem; opacity:0.4; color:var(--accent-primary);"></i><br>ไม่พบข้อมูลห้องพักตรงตามเงื่อนไข</div>`;
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
                <div class="room-modern-card">
                    <div class="room-banner-img">
                        <img src="${room.image_url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}" alt="Room ${room.room_number}">
                        <span class="room-status-pill status-${room.status}">
                            <span class="live-dot"></span> ${statusLabel}
                        </span>
                    </div>
                    <div class="room-content">
                        <div class="room-title-row">
                            <div class="room-name">ห้อง ${room.room_number} (ชั้น ${room.floor})</div>
                            <div class="room-price-tag">฿${room.price_per_month.toLocaleString()} <span>/เดือน</span></div>
                        </div>
                        <div class="amenities-pills">
                            <span class="pill-tag"><i class="fa-solid fa-bed"></i> ${room.room_type}</span>
                            <span class="pill-tag"><i class="fa-solid fa-snowflake"></i> เครื่องปรับอากาศ</span>
                            <span class="pill-tag"><i class="fa-solid fa-wifi"></i> Free Wi-Fi</span>
                        </div>
                        <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1.25rem;">${room.description || 'เตียงเดี่ยว 3.5 ฟุต, โต๊ะอ่านหนังสือ, ตู้เสื้อผ้า, เครื่องปรับอากาศ, ระเบียง'}</div>
                        <div style="margin-top:auto;">
                            ${isAvailable && currentUser.role === 'student' ? `
                                <button class="btn-glowing primary" style="width:100%;" onclick="openBookingModal(${room.id}, '${room.room_number}', ${room.price_per_month})">
                                    <i class="fa-solid fa-calendar-plus"></i> จองห้องพักนี้
                                </button>
                            ` : `
                                <button class="btn-glowing" style="width:100%; background:rgba(255,255,255,0.06); color:var(--text-muted);" disabled>
                                    ${isAvailable ? 'ห้องว่าง (สลับสิทธิ์เป็นนักศึกษาเพื่อจอง)' : statusLabel}
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
            headers: { 'Content-Type': 'application/json' },
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
                'pending': '<span style="background:rgba(245,158,11,0.2); color:#fbbf24; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-clock"></i> รอดำเนินการ</span>',
                'in_progress': '<span style="background:rgba(6,182,212,0.2); color:#38bdf8; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังซ่อมแซม</span>',
                'completed': '<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-check-circle"></i> ซ่อมแซมเสร็จสิ้น</span>'
            }[r.status] || r.status;

            const priorityBadge = {
                'low': '<span style="color:var(--text-muted); font-size:0.85rem;">ปกติ</span>',
                'medium': '<span style="color:#38bdf8; font-size:0.85rem; font-weight:700;">ปานกลาง</span>',
                'high': '<span style="color:#fbbf24; font-size:0.85rem; font-weight:700;">ด่วน</span>',
                'urgent': '<span style="color:#fb7185; font-size:0.85rem; font-weight:800;">ด่วนที่สุด</span>'
            }[r.priority] || r.priority;

            const row = `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:1.1rem 1.5rem;"><b>#REP-${r.id}</b></td>
                    <td style="padding:1.1rem 1.5rem;"><b>ห้อง ${r.room_number}</b><br><small style="color:var(--text-muted);">${r.student_name}</small></td>
                    <td style="padding:1.1rem 1.5rem;"><b>${r.title}</b><br><small style="color:var(--text-muted);">${r.description}</small></td>
                    <td style="padding:1.1rem 1.5rem;"><span class="pill-tag">${r.category}</span></td>
                    <td style="padding:1.1rem 1.5rem;">${priorityBadge}</td>
                    <td style="padding:1.1rem 1.5rem;">${statusBadge}</td>
                    <td style="padding:1.1rem 1.5rem;">${r.admin_note || '-'}</td>
                    <td style="padding:1.1rem 1.5rem;"><small>${new Date(r.reported_at).toLocaleDateString('th-TH')}</small></td>
                    <td style="padding:1.1rem 1.5rem;">
                        ${(currentUser.role === 'admin' || currentUser.role === 'owner') && r.status !== 'completed' ? `
                            <button class="btn-glowing success" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="updateRepairStatus(${r.id}, 'completed')">
                                <i class="fa-solid fa-check"></i> เสร็จสิ้น
                            </button>
                            <button class="btn-glowing warning" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="updateRepairStatus(${r.id}, 'in_progress')">
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
                'unpaid': '<span style="background:rgba(244,63,94,0.2); color:#fb7185; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> ยังไม่ชำระ</span>',
                'pending_verification': '<span style="background:rgba(6,182,212,0.2); color:#38bdf8; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-spinner fa-spin"></i> รอตรวจสอบสลิป</span>',
                'paid': '<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ชำระแล้ว</span>'
            }[b.status] || b.status;

            const row = `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:1.1rem 1.5rem;"><b>รอบ ${b.month_year}</b></td>
                    <td style="padding:1.1rem 1.5rem;"><b>ห้อง ${b.room_number}</b></td>
                    <td style="padding:1.1rem 1.5rem;">${b.student_name}</td>
                    <td style="padding:1.1rem 1.5rem;">฿${b.room_fee.toLocaleString()}</td>
                    <td style="padding:1.1rem 1.5rem;">น้ำ ฿${b.water_fee} / ไฟ ฿${b.electricity_fee}</td>
                    <td style="padding:1.1rem 1.5rem;"><b style="color:#38bdf8; font-size:1.15rem;">฿${b.total_amount.toLocaleString()}</b></td>
                    <td style="padding:1.1rem 1.5rem;"><small>${b.due_date}</small></td>
                    <td style="padding:1.1rem 1.5rem;">${statusBadge}</td>
                    <td style="padding:1.1rem 1.5rem;">
                        ${b.slip_url ? `<a href="${b.slip_url}" target="_blank" style="color:#818cf8; text-decoration:none; font-size:0.85rem;"><i class="fa-solid fa-image"></i> ดูสลิป</a>` : '-'}
                    </td>
                    <td style="padding:1.1rem 1.5rem;">
                        ${currentUser.role === 'student' && b.status === 'unpaid' ? `
                            <button class="btn-glowing success" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="openPaymentModal(${b.id}, ${b.total_amount})">
                                <i class="fa-solid fa-upload"></i> แนบสลิป
                            </button>
                        ` : ''}

                        ${(currentUser.role === 'admin' || currentUser.role === 'owner') && b.status === 'pending_verification' ? `
                            <button class="btn-glowing success" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="verifyPayment(${b.id}, 'approve')">
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
                'pending': '<span style="background:rgba(245,158,11,0.2); color:#fbbf24; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;">รอพิจารณา</span>',
                'approved': '<span style="background:rgba(16,185,129,0.2); color:#34d399; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;">อนุมัติแล้ว</span>',
                'rejected': '<span style="background:rgba(244,63,94,0.2); color:#fb7185; padding:0.35rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:700;">ปฏิเสธ</span>'
            }[bk.status] || bk.status;

            const row = `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:1.1rem 1.5rem;"><b>#BK-${bk.id}</b></td>
                    <td style="padding:1.1rem 1.5rem;"><b>${bk.student_name}</b></td>
                    <td style="padding:1.1rem 1.5rem;">${bk.student_phone}</td>
                    <td style="padding:1.1rem 1.5rem;"><b>ห้อง ${bk.room_number}</b></td>
                    <td style="padding:1.1rem 1.5rem;">${bk.room_type}</td>
                    <td style="padding:1.1rem 1.5rem;">${bk.move_in_date}</td>
                    <td style="padding:1.1rem 1.5rem;">${bk.note || '-'}</td>
                    <td style="padding:1.1rem 1.5rem;">${statusBadge}</td>
                    <td style="padding:1.1rem 1.5rem;">
                        ${bk.status === 'pending' ? `
                            <button class="btn-glowing success" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="processBooking(${bk.id}, 'approved')">
                                <i class="fa-solid fa-check"></i> อนุมัติ
                            </button>
                            <button class="btn-glowing" style="background:#dc2626; color:white; padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="processBooking(${bk.id}, 'rejected')">
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
            headers: { 'Content-Type': 'application/json' },
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
                <div style="background:var(--bg-card); backdrop-filter:blur(16px); padding:1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-glass); margin-bottom:1.25rem; border-left:5px solid ${item.priority === 'urgent' ? '#f43f5e' : '#6366f1'};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                        <div style="font-weight:700; font-size:1.15rem; color:white;">
                            ${item.priority === 'urgent' ? '<span style="background:rgba(244,63,94,0.2); color:#fb7185; padding:0.25rem 0.65rem; border-radius:12px; font-size:0.75rem; margin-right:0.6rem;"><i class="fa-solid fa-triangle-exclamation"></i> ประกาศด่วน</span>' : ''}
                            ${item.title}
                        </div>
                        <div style="font-size:0.82rem; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${new Date(item.created_at).toLocaleString('th-TH')}</div>
                    </div>
                    <div style="font-size:0.98rem; color:#e2e8f0; margin-top:0.6rem;">${item.content}</div>
                    <div style="font-size:0.82rem; color:var(--text-muted); margin-top:0.75rem;"><i class="fa-solid fa-user-pen"></i> ประกาศโดย: ${item.author_name}</div>
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
            headers: { 'Content-Type': 'application/json' },
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

// Modal Helper Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
