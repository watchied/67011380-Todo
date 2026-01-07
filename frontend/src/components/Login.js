// frontend/src/components/Login.js
import React, { useState } from 'react';

const API_URL = 'http://localhost:5001/api';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim()) {
            setError('Please enter a username.');
            return;
        }

        try {
            // Use Fetch API for POST request
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }), // Convert object to JSON string
            });

            // Check if the response status is OK (200-299)
            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.message || 'Login failed due to server error.');
                return;
            }

            const data = await response.json(); // Parse the response body as JSON

            if (data.success) {
                localStorage.setItem('todo_username', username);
                onLogin(username); // Update App component state
            } else {
                setError(data.message || 'Login failed.');
            }
        } catch (err) {
            // Handle network connection errors
            setError('Network error: Could not connect to the server.');
            console.error(err);
        }
    };

    return (
        <div class>
            <h2 className="text-2xl font-bold text-500 mb-4 w-full max-w-sm text-center">Login (Username Only)</h2>
            <form onSubmit={handleSubmit}>
                <input
                    input type="text" id="first_name" class="bg-neutral-secondary-medium mb-2 border border-default-medium text-heading text-sm rounded-md focus:ring-brand focus:border-brand block w-full px-3 py-2.5 shadow-xs placeholder:text-body" placeholder="Username" required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button type="text" id="first_name" class="w-full px-3 py-2.5 bg-orange-400 hover:bg-orange-400 text-white font-bold rounded-md shadow-sm transition-colors" requiredtype="submit">Login</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default Login;