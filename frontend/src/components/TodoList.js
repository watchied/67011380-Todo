import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const API_URL = process.env.REACT_APP_API_URL;

function TodoList({ username, onLogout, profileImage, createNewAdmin, userId, role, skills }) {
    const [todos, setTodos] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [assignees, setAssignees] = useState([]); // สำหรับ Admin เลือกคนรับงาน
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // โหลดงาน
    useEffect(() => {
        fetchTodos();
        if (role === 'admin') {
            fetchAssignees();
        }
    }, [username, role]);

    const fetchTodos = async () => {
        try {
            // ส่ง role และ userId ไปที่ backend เพื่อให้ admin เห็นงานทั้งหมด
            const response = await fetch(`${API_URL}/todos/${username}?role=${role}&userId=${userId}`);
            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error fetching todos:', err);
        }
    };

    const fetchAssignees = async () => {
        try {
            const response = await fetch(`${API_URL}/users/assignees`); // สร้าง API นี้เพื่อดึงเฉพาะ role assignee
            const data = await response.json();
            setAssignees(data);
        } catch (err) {
            console.error('Error fetching assignees:', err);
        }
    };

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTask.trim() || !targetDate) return;

        const formData = new FormData();
        formData.append('username', username);
        formData.append('task', newTask);
        formData.append('target_datetime', targetDate);
        formData.append('assigned_to', selectedAssigneeId || '');
        formData.append('creator_role', role);

        if (selectedFile) {
            formData.append('attachment', selectedFile);
        }

        try {
            const response = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setNewTask('');
                setTargetDate('');
                setSelectedFile(null);
                setSelectedAssigneeId('');
                fetchTodos();
                if (document.getElementById('fileInput')) document.getElementById('fileInput').value = '';
            } else {
                const errorData = await response.json();
                Swal.fire('Error', errorData.message, 'error');
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
        const result = await Swal.fire({
            title: 'Delete Task?',
            text: "You won't be able to revert this!",
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
                console.error('Error deleting todo:', err);
            }
        }
    };

    const handleAddMoreFiles = async (todoId) => {
        const { value: files } = await Swal.fire({
            title: 'Select files to upload',
            input: 'file',
            inputAttributes: { 'multiple': 'multiple', 'accept': '*/*' },
            showCancelButton: true,
            confirmButtonText: 'Upload'
        });

        if (files) {
            const formData = new FormData();
            Array.from(files).forEach(file => formData.append('attachments', file));
            formData.append('userId', userId);

            try {
                const response = await fetch(`${API_URL}/todos/${todoId}/upload`, {
                    method: 'POST',
                    body: formData
                });
                if (response.ok) {
                    Swal.fire('Success', 'Files uploaded successfully', 'success');
                    fetchTodos();
                }
            } catch (err) {
                Swal.fire('Error', 'Failed to upload files', 'error');
            }
        }
    };

    const getProfileImageUrl = (imageName) => {
        if (!imageName) return "/default-avatar.png";
        return imageName.startsWith('http') ? imageName : `http://localhost:5001/uploads/${imageName}`;
    };

    const handleAssignChange = async (todoId, newAssigneeId) => {
        try {
            const response = await fetch(`${API_URL}/todos/${todoId}/assign`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_to: newAssigneeId })
            });
            if (response.ok) {
                fetchTodos(); // รีโหลดข้อมูลใหม่
            }
        } catch (err) { console.error('Assign error:', err); }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleString('en-GB');

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
                {role === 'assignee' && skills && <div className="small text-muted mt-2 italic">Skills: {skills}</div>}
            </div>

            {role === 'admin' && (
                <button className="btn btn-primary w-100 mb-3 py-2 shadow-sm fw-bold rounded-3" onClick={createNewAdmin}>
                    <i className="bi bi-person-plus me-2"></i>Create Admin
                </button>
            )}

            <div className="flex-grow-1">
                <h6 className="text-muted small fw-bold text-uppercase mb-4">Menu</h6>
                <button className="btn btn-primary text-start w-100 py-2 px-3 rounded-3 shadow-sm">
                    <i className="bi bi-list-task me-2"></i> Draft Ticket
                </button>
                <button className="btn btn-primary text-start w-100 py-2 px-3 mt-2 rounded-3 shadow-sm">
                    <i className="bi bi-list-task me-2"></i> View Tickets
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
                    {filteredTasks.map(todo => {
                        let taskFiles = [];
                        try {
                            taskFiles = typeof todo.files === 'string' ? JSON.parse(todo.files) : (todo.files || []);
                        } catch (e) { taskFiles = []; }

                        return (
                            <div key={todo.id} className="list-group-item px-0 py-3 border-bottom">
                                <div className="d-flex align-items-start justify-content-between gap-3">
                                    <div className="d-flex flex-column flex-grow-1">
                                        <span className={`fw-medium mb-1 ${todo.status === 'Done' ? 'text-decoration-line-through text-muted' : 'text-dark'}`}>
                                            {todo.task}
                                        </span>

                                        <div className="d-flex flex-wrap gap-2 mb-2">
                                            {taskFiles.map((file, idx) => (
                                                <a key={idx} href={`http://localhost:5001/uploads/${file.file_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-light border text-primary" download={file.file_name}>
                                                    <i className="bi bi-file-earmark-arrow-down-fill me-1"></i> {file.file_name}
                                                </a>
                                            ))}
                                        </div>

                                        {Number(todo.assigned_to) === Number(userId) && (
                                            <button className="btn btn-sm btn-outline-success border-dashed mb-2" style={{ width: 'fit-content', fontSize: '0.7rem' }} onClick={() => handleAddMoreFiles(todo.id)}>
                                                <i className="bi bi-plus-circle me-1"></i> Add work files
                                            </button>
                                        )}

                                        <small className="fw-bold" style={{ fontSize: '0.75rem', color: '#2563EB' }}>
                                            <i className="bi bi-calendar-event me-1"></i> Target: {formatDate(todo.target_datetime)}
                                        </small>

                                        {role === 'admin' && (
                                            <small className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                                                Owner: <strong>{todo.username}</strong>
                                            </small>
                                        )}
                                    </div>

                                    <div className="d-flex flex-column align-items-end gap-2">
                                        {todo.assigned_user_name && (
                                            <span className="badge bg-info-subtle text-info border border-info-subtle rounded-pill px-2" style={{ fontSize: '0.7rem' }}>
                                                For: {todo.assigned_user_name}
                                            </span>
                                        )}
                                        <div className="d-flex gap-2">
                                            {role === 'admin' && (
                                                <select
                                                    className="form-select form-select-sm shadow-none border-info text-info"
                                                    style={{ width: '130px', fontSize: '0.75rem' }}
                                                    value={todo.assigned_to || ''}
                                                    onChange={(e) => handleAssignChange(todo.id, e.target.value)}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {assignees.map(a => (
                                                        <option key={a.id} value={a.id}>{a.username}</option>
                                                    ))}
                                                </select>
                                            )}
                                            <select
                                                className="form-select form-select-sm"
                                                value={todo.status}
                                                onChange={(e) => handleStatusChange(todo.id, e.target.value)}
                                                disabled={role !== 'admin' && Number(todo.assigned_to) !== Number(userId) && todo.username !== username}
                                            >
                                                <option value="Todo">Todo</option>
                                                <option value="Doing">Doing</option>
                                                <option value="Done">Done</option>
                                            </select>
                                            {(role === 'admin' || todo.username === username) && (
                                                <button className="btn btn-link text-danger btn-sm p-0" onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
                        <h2 className="fw-bold mb-0">All Tasks</h2>
                        <button className="btn btn-outline-danger px-4 rounded-pill" onClick={onLogout}>Logout</button>
                    </div>

                    {role !== 'assignee' && (
                        <form onSubmit={handleAddTodo} className="mb-5 p-4 border rounded-4 shadow-sm bg-white">
                            <div className="mb-3">
                                <label className="form-label fw-bold small text-muted">Task Description</label>
                                <input type="text" className="form-control border-0 bg-light py-2" placeholder="What needs to be done?" value={newTask} onChange={(e) => setNewTask(e.target.value)} required />
                            </div>

                            {role === 'admin' && (
                                <div className="mb-3">
                                    <label className="form-label fw-bold small text-muted">Assign To (Optional)</label>
                                    <select className="form-select border-0 bg-light" value={selectedAssigneeId} onChange={(e) => setSelectedAssigneeId(e.target.value)}>
                                        <option value="">Myself / No Specific Assignee</option>
                                        {assignees.map(a => (
                                            <option key={a.id} value={a.id}>{a.username} ({a.skills || 'No skills listed'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="row g-2">
                                <div className="col-md-8">
                                    <div className="input-group">
                                        <span className="input-group-text border-0 bg-light small text-muted">Target Date</span>
                                        <input type="datetime-local" className="form-control border-0 bg-light" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <button className="btn btn-primary w-100 py-2 fw-bold shadow-sm" type="submit">Add Task</button>
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