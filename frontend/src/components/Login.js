// frontend/src/components/Login.js
import React, { useEffect, useState } from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";
//import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import {gapi} from 'gapi-script';
const API_URL = process.env.REACT_APP_API_URL;

function Login({ onLogin, goToSignUp }) {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const GOOGLE_CLIENT_ID = "618947792486-r6e8k3bib6dgm47c4i5di5ekvasc3r08.apps.googleusercontent.com";
    useEffect(() => {
        const initClient = () => {
            gapi.client.init({
                clientId: GOOGLE_CLIENT_ID,
                scope: ''
            });
        }
        gapi.load('client:auth2', initClient);
    }, []);
    const handleGoogleLoginSuccess = (response) => {
        console.log("Google Login Success:", response);
    }

    const handleGoogleLoginFailure = (error) => {
        console.error("Google Login Failure:", error);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter username and password.');
            return;
        }

        if (!captchaToken) {
            setError('Please verify that you are not a robot.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Login failed.');
                return;
            }

            localStorage.setItem('todo_username', data.user.username);
            onLogin(data.user.username);

        } catch (err) {
            setError('Network error: Could not connect to the server.');
        }
    };
    
    return (
        <div className="text-center">
            <h4 className="fw-bold mb-3">Login</h4>
            <p className="text-muted small mb-4">Please enter your username and password.</p>

            <form onSubmit={handleSubmit}>

                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">Username</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Rick Astley"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">
                        Password
                    </label>

                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            className="form-control"
                            style={{ paddingRight: '40px' }}
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                cursor: 'pointer',
                                zIndex: 10,
                                color: '#6c757d'
                            }}
                        >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-danger py-2 small" role="alert">
                        {error}
                    </div>
                )}
                <ReCAPTCHA
                    sitekey="6LeQBlssAAAAAFZTj22xDHurWEaMtcsTyngKlH4H"
                    onChange={(token) => setCaptchaToken(token)}
                />
                <button type="submit" className="btn btn-primary w-100 mt-2 py-2">
                    Login
                </button>
                <div className="d-flex justify-content-end mt-3">
                    <span
                        className="small text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={goToSignUp}
                    >
                        Create account
                    </span>
                </div>
                
            </form>
        </div>
    );
}

export default Login;