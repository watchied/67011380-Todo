import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TodoList from './components/TodoList';
import SignUp from './components/Signin';
import CreateTeam from './components/CreateTeam';
import CreateNewAdmin from './components/CreateNewAdmin';
import './App.css'; // Make sure this is imported!

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [page, setPage] = useState('login');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [profileImage, setProfileImage] = useState('');
    const [userRole, setUserRole] = useState('');
    useEffect(() => {
        const storedUser = localStorage.getItem('todo_username');
        if (storedUser) setCurrentUser(storedUser);
        const storedImage = localStorage.getItem('todo_profile');
        if (storedImage) setProfileImage(storedImage);
        const storedRole = localStorage.getItem('todo_user_role');
        if (storedRole) setUserRole(storedRole);
        const storedUserId = localStorage.getItem('todo_user_id');
        if (storedUserId) setCurrentUserId(storedUserId);
    }, []);

    const handleLogin = (username, image, id, role) => {
        setCurrentUser(username);
        setCurrentUserId(id);
        setProfileImage(image);
        setUserRole(role);
        localStorage.setItem('todo_username', username);
        localStorage.setItem('todo_user_id', id); // บันทึกลงเครื่อง
        localStorage.setItem('todo_profile', image);
        localStorage.setItem('todo_user_role', role);
        setPage('todoList'); // ไปที่หน้า Todo หลัง Login สำเร็จ
        console.log(role);
    };

    const handleLogout = () => {
        localStorage.removeItem('todo_username');
        localStorage.removeItem('todo_user_id'); // ลบ ID ออกตอน Logout
        localStorage.removeItem('todo_profile');
        localStorage.removeItem('todo_user_role');
        setCurrentUser(null);
        setCurrentUserId(null);
        setUserRole('');
        setPage('login');
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-4 px-3">
            {/* ปรับบรรทัดนี้: ถ้า Login แล้วให้กว้างระดับ xl-11 แต่ถ้ายังไม่ Login ให้กว้างแค่ xl-6 */}
            <div className={currentUser
                ? "col-12 col-lg-11 col-xl-11"
                : "col-12 col-sm-10 col-md-8 col-lg-7 col-xl-6"
            } style={currentUser ? { maxWidth: '1400px', transition: 'all 0.3s ease' } : { transition: 'all 0.3s ease' }}>

                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-body p-4 p-sm-5">

                        {/* Branding Section: ซ่อนหรือปรับขนาดเมื่อ Login แล้วเพื่อให้มีพื้นที่ทำงานมากขึ้น */}
                        {!currentUser && (
                            <header className="text-center mb-5">
                                <div className="logo-wrapper">
                                    <img src="/cei_logo.png" alt="CEI Logo" style={{ width: "50px" }} />
                                </div>
                                <h2 className="fw-bold mb-1">CEI Todo</h2>
                                <p className="text-muted small">Efficiency at your fingertips</p>
                            </header>
                        )}

                        <main>
                            {currentUser ? (
                                /* ถ้าล็อกอินแล้ว ให้เลือกระหว่างหน้า CreateTeam หรือ TodoList */
                                page === 'createTeam' ? (
                                    <CreateTeam
                                        username={currentUser}
                                        onBack={() => setPage('todoList')}
                                    />
                                ) : page === 'createNewAdmin' ? (
                                    <CreateNewAdmin
                                        onSuccess={() => setPage('todoList')}
                                        onBack={() => setPage('todoList')}
                                    />
                                ) :  (
                                    <TodoList
                                        username={currentUser}
                                        userId={currentUserId} // ส่ง ID เข้าไปที่ TodoList เพื่อใช้เช็คสิทธิ์
                                        onLogout={handleLogout}
                                        profileImage={profileImage}
                                        createTeam={() => setPage('createTeam')}
                                        createNewAdmin={() => setPage('createNewAdmin')}
                                        role={userRole}
                                    />
                                )
                            ) : page === 'login' ? (
                                <Login
                                    onLogin={handleLogin}
                                    goToSignUp={() => setPage('signup')}
                                />
                            ) : page === 'signup' ? (
                                <SignUp
                                    onSuccess={() => setPage('login')}
                                    goToLogIn={() => setPage('login')}
                                />
                            ) : null}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;