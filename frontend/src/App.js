// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import TodoList from './components/TodoList';


function App() {
    const [currentUser, setCurrentUser] = useState(null);

    // Check for stored username on initial load
    useEffect(() => {
        const storedUser = localStorage.getItem('todo_username');
        if (storedUser) {
            setCurrentUser(storedUser);
        }
    }, []);

    const handleLogin = (username) => {
        setCurrentUser(username);
    };

    const handleLogout = () => {
        // Clear username from local storage and state
        localStorage.removeItem('todo_username');
        setCurrentUser(null);
    };

    return (
        <div className="App" class = "bg-scroll bg-gradient-to-r from-red-100 via-orange-100 to-grey-100 h-screen flex flex-col items-center justify-start pt-20 gap-8">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 w-full max-w-[320px] sm:max-w-md flex flex-col items-center">
                <img
                src="/cropped-ceip-fav-1.png"
                alt="CEI Logo"
                class="w-16 h-16 mb-4 flex items-center justify-center"
                />
                <p class="text-3xl font-bold flex text-center justify-center mb-8">Full Stack Todo App</p>
                <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="Todo Icon" class="w-24 h-24 mb-8"/>
                {/* Conditional rendering based on login status */}
                {currentUser ? (
                    <TodoList username={currentUser} onLogout={handleLogout} />
                ) : (
                <Login onLogin={handleLogin} />
            )}
            </div>
        </div>
    );
}

export default App;