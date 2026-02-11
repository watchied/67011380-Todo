import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ username, userEmail, onLogout, profileImage, createNewAdmin, userId, role, skills }) {
    const [todos, setTodos] = useState([]);
    const [requestMessage, setRequestMessage] = useState(''); // สำหรับ User ส่ง Request
    const [assignees, setAssignees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentView, setCurrentView] = useState('user-requests');
    // Load Data
    useEffect(() => {
        fetchTodos();
        if (role === 'admin') {
            fetchAssignees();
        }
    }, [username, role]);

    const fetchTodos = async () => {
        try {
            // ดึงข้อมูลตาม Role (Admin เห็นหมด, User/Assignee เห็นเฉพาะที่เกี่ยวข้อง)
            const response = await fetch(`${API_URL}/todos/${username}?role=${role}&userId=${userId}`);
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    const fetchAssignees = async () => {
        try {
            const response = await fetch(`${API_URL}/users/assignees`);
            const data = await response.json();
            setAssignees(data);
        } catch (err) {
            console.error('Error fetching assignees:', err);
        }
    };

    // --- ส่วนของ USER: Submit New Request ---
    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!requestMessage.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/user-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_email: userEmail || username, // ใช้อีเมลหรือ username
                    message: requestMessage ,
                    user_id: userId
                }),
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Request Submitted',
                    text: 'AI has generated a draft for the Admin to review.',
                    confirmButtonColor: '#007bff'
                });
                setRequestMessage('');
                fetchTodos(); // Refresh list
            }
        } catch (err) {
            console.error('Error submitting request:', err);
            Swal.fire('Error', 'Failed to send request', 'error');
        } finally {
            setLoading(false);
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
        const result = await Swal.fire({
            title: 'Delete this item?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await fetch(`${API_URL}/todos/${id}`, { method: 'DELETE' });
                fetchTodos();
            } catch (err) {
                console.error('Error deleting:', err);
            }
        }
    };

    const getProfileImageUrl = (imageName) => {
        if (!imageName) return "/default-avatar.png";
        return imageName.startsWith('http') ? imageName : `http://localhost:5001/uploads/${imageName}`;
    };

    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleString('en-GB') : 'No Deadline';

    // Sidebar Render
    const renderSidebar = () => (
    <div className="d-none d-md-flex flex-column border-end shadow-sm bg-light" style={{ width: '280px', minHeight: '100vh', padding: '2rem 1.5rem', position: 'sticky', top: 0 }}>
        <div className="text-center mb-5">
            <img src={getProfileImageUrl(profileImage)} alt="Profile" className="rounded-circle border border-4 border-white shadow-sm mb-3" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
            <h5 className="fw-bold text-dark mb-0">{username}</h5>
            <div className="mt-1">
                {role === 'admin' && <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2">Admin System</span>}
                {role === 'assignee' && <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2">Assignee</span>}
                {role === 'user' && <span className="text-muted small">Personal Account</span>}
            </div>
        </div>

        {role === 'admin' && (
            <button className="btn btn-primary w-100 mb-4 py-2 shadow-sm fw-bold rounded-3" onClick={createNewAdmin}>
                <i className="bi bi-person-plus me-2"></i>Create Admin
            </button>
        )}

        <div className="flex-grow-1">
            <h6 className="text-muted small fw-bold text-uppercase mb-3">Management</h6>
            
            {/* 1. User Requests (Top priority for Admin) */}
            <button 
                className={`btn text-start w-100 py-2 px-3 rounded-3 mb-2 transition-all ${currentView === 'user-requests' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setCurrentView('user-requests')}
            >
                <i className="bi bi-chat-left-text me-2"></i> User Requests
            </button>

            {/* 2. Draft Tickets */}
            <button 
                className={`btn text-start w-100 py-2 px-3 rounded-3 mb-2 transition-all ${currentView === 'drafts' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setCurrentView('drafts')}
            >
                <i className="bi bi-pencil-square me-2"></i> Draft Tickets
            </button>

            {/* 3. Official Tickets */}
            <button 
                className={`btn text-start w-100 py-2 px-3 rounded-3 mb-2 transition-all ${currentView === 'official' ? 'btn-primary shadow-sm' : 'btn-light'}`}
                onClick={() => setCurrentView('official')}
            >
                <i className="bi bi-ticket-perforated me-2"></i> Official Tickets
            </button>
        </div>
    </div>
);

    const renderTaskGroup = (statusLabel) => {
        const filteredTasks = todos.filter(t => t.status === statusLabel);
        return (
            <div className="mb-5" key={statusLabel}>
                <h6 className={`p-3 rounded-3 fw-bold mb-3 ${statusLabel === 'Done' ? 'bg-success-subtle text-success' : statusLabel === 'Doing' ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary'}`}>
                    {statusLabel}
                </h6>
                <div className="list-group list-group-flush">
                    {filteredTasks.length === 0 ? <p className="text-muted small ms-3">No items found.</p> : filteredTasks.map(todo => (
                        <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                            <div className="d-flex align-items-start justify-content-between gap-3">
                                <div className="d-flex flex-column flex-grow-1">
                                    <span className="fw-medium mb-1 text-dark">{todo.task}</span>
                                    <small className="fw-bold" style={{ fontSize: '0.75rem', color: '#2563EB' }}>
                                        <i className="bi bi-calendar-event me-1"></i> Deadline: {formatDate(todo.target_datetime)}
                                    </small>
                                    <small className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                                        From: <strong>{todo.username}</strong>
                                    </small>
                                </div>
                                <div className="d-flex flex-column align-items-end gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        value={todo.status}
                                        onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                                        disabled={role === 'user'} // User แก้สถานะไม่ได้
                                    >
                                        <option value="Todo">Todo</option>
                                        <option value="Doing">Doing</option>
                                        <option value="Done">Done</option>
                                    </select>
                                    {role === 'admin' && (
                                        <button className="btn btn-link text-danger btn-sm p-0 text-decoration-none" onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
                                    )}
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
                        <h2 className="fw-bold mb-0">{role === 'user' ? 'My Requests' : 'Request Management'}</h2>
                        <button className="btn btn-outline-danger px-4 rounded-pill" onClick={onLogout}>Logout</button>
                    </div>

                    {/* USER FORM: Submit Request instead of Add Task */}
                    {role === 'user' && (
                        <form onSubmit={handleSubmitRequest} className="mb-5 p-4 border rounded-4 shadow-sm bg-white">
                            <div className="mb-3">
                                <label className="form-label fw-bold small text-muted">Submit New Request (AI Handled)</label>
                                <textarea 
                                    className="form-control border-0 bg-light py-2" 
                                    rows="3"
                                    placeholder="Describe your issue or what you need help with..." 
                                    value={requestMessage} 
                                    onChange={(e) => setRequestMessage(e.target.value)} 
                                    required 
                                />
                            </div>
                            <button className="btn btn-primary px-5 py-2 fw-bold shadow-sm rounded-pill w-100" type="submit" disabled={loading}>
                                {loading ? 'Processing...' : 'Send Request to AI'}
                            </button>
                        </form>
                    )}

                    {['Todo', 'Doing', 'Done'].map(status => renderTaskGroup(status))}
                </div>
            </div>
        </div>
    );
}

export default TodoList;