import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TodoList from './components/TodoList';
import SignUp from './components/Signin';
//
import './App.css'; // Make sure this is imported!

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [page, setPage] = useState('login');
    
    useEffect(() => {
        const storedUser = localStorage.getItem('todo_username');
        if (storedUser) setCurrentUser(storedUser);
    }, []);

    const handleLogin = (username) => setCurrentUser(username);
    const handleLogout = () => {
        localStorage.removeItem('todo_username');
        setCurrentUser(null);
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center py-4 px-3">
            <div className="col-12 col-sm-10 col-md-8 col-lg-7 col-xl-6">

                <div className="card">
                    <div className="card-body p-4 p-sm-5">

                        {/* BRANDING SECTION */}
                        <header className="text-center mb-5">
                            <div className="logo-wrapper">
                                <img
                                    src="/cei_logo.png"
                                    alt="CEI Logo"
                                    style={{ width: "50px" }}
                                />
                            </div>
                            <h2 className="fw-bold mb-1">CEI Todo</h2>
                            <p className="text-muted small">Efficiency at your fingertips</p>
                        </header>

                        {/* CONTENT AREA */}
                        <main>
                            {currentUser ? (
                                <TodoList
                                    username={currentUser}
                                    onLogout={handleLogout}
                                />
                            ) : page === 'login' ? (
                                <Login
                                    onLogin={handleLogin}
                                    goToSignUp={() => setPage('signup')}
                                    
                                />
                            ) : (
                                <SignUp
                                    onSuccess={() => setPage('login')}
                                    goToLogIn={() => setPage('login')}
                                />
                            )}
                        </main>

                    </div>
                </div>

                {/* OPTIONAL: FOOTER LINKS */}
                <div className="mt-4 text-center">
                    <small className="text-muted">© 2025 CEI Todo App. All rights reserved.</small>
                </div>

            </div>
        </div>
    );
}

export default App;