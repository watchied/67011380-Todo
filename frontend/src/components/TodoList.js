// frontend/src/components/TodoList.js
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

// ตรวจสอบว่าใน .env ของคุณมี /api ต่อท้ายหรือไม่ 
// หากมีอยู่แล้ว ใน fetch ห้ามใส่ /api ซ้ำ
const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ username, onLogout, profileImage, createTeam,userId }) {
    const [todos, setTodos] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]); // เก็บสมาชิกในทีมที่เลือก
    const [selectedUsers, setSelectedUsers] = useState([]); // เก็บ ID สมาชิกที่ถูกติ๊ก
    const storedUser = localStorage.getItem('todo_user_id');
    console.log("User ID from Storage:",userId);

    // โหลดงานใหม่ทุกครั้งที่เปลี่ยนทีม
    useEffect(() => {
        fetchTodos();
    }, [username, selectedTeam]);

    // โหลดรายชื่อทีมครั้งแรก
    useEffect(() => {
        fetchTeams();
    }, [username]);

    // ล้างค่าเมื่อสลับทีม
    useEffect(() => {
        if (selectedTeam) {
            fetch(`${API_URL}/teams/${selectedTeam.id}/members`)
                .then(res => res.json())
                .then(data => setTeamMembers(data));
        }
    }, [selectedTeam]);

    useEffect(() => {
        setSelectedUsers([]);
        fetchTodos();
    }, [selectedTeam]);

    const handleUserCheckbox = (userId) => {
        setSelectedUsers(prev => {
            // ใช้ userId ที่รับมา ซึ่งควรเป็นตัวเลข id ของ user นั้นๆ
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleUserSelect = (userId) => {
        // ถ้าคลิกซ้ำคนเดิมให้ติ๊กออก (null) ถ้าคลิกคนใหม่ให้เปลี่ยนเป็น ID นั้นทันที
        setSelectedUsers(prev => prev === userId ? null : userId);
    };

    const fetchTodos = async () => {
        try {
            // ตรวจสอบว่ามี selectedTeam หรือไม่
            const endpoint = selectedTeam
                ? `${API_URL}/teams/${selectedTeam.id}/todos` // ถ้าเลือกทีม ให้ไปดึงงานของทีม
                : `${API_URL}/todos/${username}`;           // ถ้าไม่เลือก ให้ดึงงานส่วนตัว

            const response = await fetch(endpoint);
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const fetchTeams = async () => {
        try {
            const response = await fetch(`${API_URL}/teams/${username}`);
            const data = await response.json();
            setTeams(data);
        } catch (err) {
            console.error('Error fetching teams:', err);
        }
    };

    // --- ระบบจัดการทีม (Admin Tools) ---

    const handleInviteClick = async (team) => {
        const { value: targetUsername } = await Swal.fire({
            title: `Invite to ${team.team_name}`,
            input: 'text',
            inputLabel: 'Enter Username',
            inputPlaceholder: 'username',
            showCancelButton: true
        });

        if (targetUsername) {
            try {
                // 1. ค้นหา User
                const userRes = await fetch(`${API_URL}/users/search/${targetUsername}`);
                if (!userRes.ok) throw new Error('User not found');
                const targetUser = await userRes.json();

                // 2. ส่งคำเชิญ
                const inviteRes = await fetch(`${API_URL}/teams/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        team_id: team.id,
                        user_id: targetUser.id
                    })
                });

                const result = await inviteRes.json();
                if (result.success) {
                    Swal.fire('Success!', `Added ${targetUsername} to ${team.team_name}`, 'success');
                } else {
                    Swal.fire('Error', result.message, 'error');
                }
            } catch (err) {
                Swal.fire('Error', err.message, 'error');
            }
        }
    };

    const handleManageMembers = async (team) => {
        try {
            // แก้ไข Path ให้ไม่ซ้ำซ้อนเพื่อกัน Error 404
            const res = await fetch(`${API_URL}/teams/${team.id}/members`);
            if (!res.ok) throw new Error('Failed to fetch members');
            const members = await res.json();

            Swal.fire({
                title: `Manage ${team.team_name}`,
                html: `
                    <div class="list-group text-start">
                        ${members.map(m => `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <div class="fw-bold">${m.username}</div>
                                    <small class="text-muted">${m.role}</small>
                                </div>
                                ${m.role !== 'admin' ?
                        `<button class="btn btn-sm btn-outline-danger" onclick="window.removeMember(${team.id}, ${m.user_id})">Remove</button>`
                        : ''}
                            </div>
                        `).join('')}
                    </div>
                `,
                showConfirmButton: false,
                showCloseButton: true
            });
        } catch (err) {
            Swal.fire('Error', 'Could not load members', 'error');
        }
    };

    // ฟังก์ชันลบสมาชิก (Global function สำหรับเรียกจาก HTML String ใน Swal)
    window.removeMember = async (teamId, userId) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "Remove this member from team?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, remove!'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_URL}/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
                if (res.ok) {
                    Swal.close();
                    Swal.fire('Removed!', 'Member has been removed.', 'success');
                }
            } catch (err) {
                Swal.fire('Error', 'Could not remove member', 'error');
            }
        }
    };

    // --- Task Actions ---

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTask.trim() || !targetDate) return;

        try {
            const response = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    task: newTask,
                    target_datetime: targetDate,
                    team_id: selectedTeam?.id,
                    // ตรวจสอบว่า selectedUsers เก็บ ID เพียงตัวเดียว เช่น 1 หรือ 2
                    assigned_to: selectedUsers
                }),
            });

            if (response.ok) {
                setNewTask('');
                setTargetDate('');
                setSelectedUsers([]); // ล้างค่าเป็น Array ว่าง
                fetchTodos();
            }
        } catch (err) {
            console.error('Error adding todo:', err);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await fetch(`${API_URL}/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchTodos();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleDeleteTodo = async (id) => {
        try {
            await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
            fetchTodos();
        } catch (err) {
            console.error('Error deleting todo:', err);
        }
    };

    // --- Helpers & Styles ---

    const getProfileImageUrl = (imageName) => {
        if (!imageName) return "/default-avatar.png";
        if (imageName.startsWith('http')) return imageName;
        return `http://localhost:5001/uploads/${imageName}`;
    };

    const getStatusHeaderClass = (status) => {
        switch (status) {
            case 'Doing': return { backgroundColor: '#FFF4CC', color: '#856404' };
            case 'Done': return { backgroundColor: '#E6F4EA', color: '#1E4620' };
            default: return { backgroundColor: '#E8F0FE', color: '#1C3A5F' };
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-GB');

    const sidebarStyle = {
        width: '280px', minHeight: '100vh', backgroundColor: '#f8f9fa',
        padding: '2rem 1.5rem', position: 'sticky', top: 0
    };

    // --- Render Components ---

    const renderSidebar = () => (
        <div className="d-none d-md-flex flex-column border-end shadow-sm" style={sidebarStyle}>
            <div className="text-center mb-5">
                <img src={getProfileImageUrl(profileImage)} alt="Profile" className="rounded-circle border border-4 border-white shadow-sm mb-3" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                <h5 className="fw-bold text-dark mb-0">{username}</h5>
                <small className="text-muted">Personal Account</small>
            </div>

            <button className="btn btn-primary w-100 mb-5 py-3 shadow-sm fw-bold rounded-4" onClick={createTeam}>
                <i className="bi bi-plus-lg me-2"></i>Create Team
            </button>

            <div className="flex-grow-1">
                <h6 className="text-muted small fw-bold text-uppercase mb-4">Tasks</h6>
                <div className="d-flex flex-column gap-2">
                    <button className={`btn text-start py-2 px-3 rounded-3 ${!selectedTeam ? 'btn-primary shadow-sm' : 'btn-light'}`} onClick={() => setSelectedTeam(null)}>
                        Personal Tasks
                    </button>

                    <div className="team-list mt-4">
                        <h6 className="text-muted small py-3 fw-bold mb-3 border-top pt-3">MY TEAMS</h6>
                        {teams.map(team => (
                            <div key={team.id} className="d-flex align-items-center mb-2 gap-2">
                                <button
                                    onClick={() => setSelectedTeam(team)}
                                    className={`btn text-start flex-grow-1 rounded-3 ${selectedTeam?.id === team.id ? 'btn-primary shadow-sm' : 'btn-light'}`}
                                >
                                    <div className="d-flex align-items-center justify-content-between">
                                        <span className="text-truncate" style={{ maxWidth: '100px' }}>{team.team_name}</span>
                                        {team.role === 'admin' && <span className="badge bg-info" style={{ fontSize: '0.5rem' }}>Admin</span>}
                                    </div>
                                </button>

                                {team.role === 'admin' && (
                                    <div className="d-flex gap-1">
                                        <button className="btn btn-outline-primary btn-sm rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }}
                                            onClick={(e) => { e.stopPropagation(); handleInviteClick(team); }}>
                                            <i className="bi bi-person-plus-fill"></i>
                                        </button>
                                        <button className="btn btn-outline-secondary btn-sm rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }}
                                            onClick={(e) => { e.stopPropagation(); handleManageMembers(team); }}>
                                            <i className="bi bi-gear-fill"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTaskGroup = (statusLabel) => {
        const filteredTasks = todos.filter(t => t.status === statusLabel);

        return (
            <div className="mb-5" key={statusLabel}>
                <h6 className="p-3 rounded-3 fw-bold mb-3" style={getStatusHeaderClass(statusLabel)}>{statusLabel}</h6>
                <div className="list-group list-group-flush">
                    {filteredTasks.map(todo => (
                        console.log("Current Todo:", todo),
                        <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div className="d-flex flex-column flex-grow-1">
                                    <span className={`fw-medium mb-1 ${todo.status === 'Done' ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>{todo.task}</span>
                                    <small className="fw-bold" style={{ fontSize: '0.75rem', color: '#2563EB' }}>Target: {formatDate(todo.target_datetime)}</small>
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-1">


                                    {todo.assigned_user_name && (
                                        <span className="badge bg-light text-primary border rounded-pill px-2" style={{ fontSize: '0.75rem' }}>
                                            <i className="bi bi-person me-1"></i>
                                            For: {todo.assigned_user_name}
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        value={todo.status}
                                        onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                                        disabled={
                                            selectedTeam &&
                                            selectedTeam.role !== 'admin' &&
                                            Number(todo.assigned_to) !== Number(userId) // เช็คชื่อจากข้อมูลที่ JOIN มา
                                        }
                                    >
                                        <option value="Todo">Todo</option>
                                        <option value="Doing">Doing</option>
                                        <option value="Done">Done</option>
                                    </select>
                                    <button className="btn btn-link text-danger btn-sm fw-bold p-0 ms-1" onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="d-flex min-vh-100 bg-white">
            {renderSidebar()}
            <div className="flex-grow-1 p-4 p-lg-5">
                <div className="mx-auto" style={{ maxWidth: '800px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-5">
                        <h2 className="fw-bold mb-0">{selectedTeam ? selectedTeam.team_name : "Personal Tasks"}</h2>
                        <button className="btn btn-outline-danger px-4 rounded-pill" onClick={onLogout}>Logout</button>
                    </div>
                    {(!selectedTeam || selectedTeam.role === 'admin') && (
                        <form onSubmit={handleAddTodo} className="mb-5 p-4 border rounded-4 shadow-sm bg-white">
                            <div className="mb-3">
                                <label className="form-label fw-bold small text-muted">Task Description</label>
                                <input type="text" className="form-control border-0 bg-light py-2 shadow-none" placeholder="What needs to be done?" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
                            </div>

                            {/* แสดงเฉพาะเมื่อเลือกทีม: ส่วนเลือกสมาชิก (Assign Members) */}
                            {teamMembers.map(member => (
                                <div
                                    key={member.user_id}
                                    className={`form-check border px-3 py-1 rounded-pill ${selectedUsers === member.user_id ? 'bg-primary text-white' : 'bg-light'}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleUserSelect(member.user_id)}
                                >
                                    <input
                                        type="checkbox" // หรือเปลี่ยนเป็น type="radio" ก็ได้
                                        className="form-check-input ms-0 me-2"
                                        id={`user-${member.user_id}`}
                                        // เช็คว่า ID นี้คือ ID เดียวที่ถูกเลือกหรือไม่
                                        checked={selectedUsers === member.user_id}
                                        onChange={() => { }}
                                    />
                                    <label className="form-check-label small user-select-none" htmlFor={`user-${member.user_id}`}>
                                        {member.username}
                                    </label>
                                </div>
                            ))}

                            <div className="row g-2">
                                <div className="col-md-8">
                                    <div className="input-group">
                                        <span className="input-group-text border-0 bg-light small text-muted">Target Date</span>
                                        <input type="datetime-local" className="form-control border-0 bg-light shadow-none" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <button className="btn btn-primary w-100 py-2 fw-bold shadow-sm" type="submit">
                                        <i className="bi bi-plus-circle me-2"></i>Add Task
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}

                    {['Todo', 'Doing', 'Done'].map(status => renderTaskGroup(status))}
                </div>
            </div>
        </div>
    );
}

export default TodoList;