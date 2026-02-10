// frontend/src/components/Login.js
import React, { useState, useRef } from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
const API_URL = process.env.REACT_APP_API_URL;

function Login({ onLogin, goToSignUp }) {
    const recaptchaRef = useRef(null);
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLoginFail = async () => {
        setCaptchaToken(null);
        if (recaptchaRef.current) {
            recaptchaRef.current.reset();
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter username and password.');
            handleLoginFail();
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
                body: JSON.stringify({ username, password, captchaToken }),
            });
            console.log(response);
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Login failed.');
                handleLoginFail();
                return;
            }
            console.log(data.user.id)
            localStorage.setItem('todo_user_id', data.user.id);
            localStorage.setItem('todo_username', data.user.username);
            localStorage.setItem('todo_profile', data.user.profileImage);
            localStorage.setItem('todo_user_role', data.user.role);
            onLogin(data.user.username, data.user.profileImage, data.user.id, data.user.role);
        } catch (err) {
            setError('Network error: Could not connect to the server.');
        }
    };
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            console.log(credentialResponse);
            // 1. (Optional) Decode locally to get name/email immediately
            const decoded = jwtDecode(credentialResponse.credential);
            const googleProfilePic = decoded.picture;
            // 2. Send token to your backend for verification
            const response = await fetch(`${API_URL}/google-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: credentialResponse.credential,
                    profileImage: googleProfilePic
                }),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('todo_user_id', data.user.id);
                localStorage.setItem('todo_username', data.user.username);
                localStorage.setItem('todo_profile', data.user.profileImage || '');
                localStorage.setItem('todo_user_role', data.user.role);
                onLogin(data.user.username, data.user.profileImage || '', data.user.id, data.user.role);
            } else {
                setError(data.message || 'Google login failed on server.');
            }
        } catch (err) {
            setError('Failed to connect to server during Google login.');
        }
    };

    const handleGoogleError = () => {
        console.log("Google Login Failed");
        setError("Google Login Failed. Please try again.");
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
                <div className="d-flex justify-content-center mt-2">
                    <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey="6LeQBlssAAAAAFZTj22xDHurWEaMtcsTyngKlH4H"
                        onChange={(token) => setCaptchaToken(token)}
                    />
                </div>
                <button type="submit" className="btn btn-primary w-100 mt-2 py-2">
                    Login
                </button>
                <div className="mt-2">
                    <GoogleLogin

                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        shape="pill"
                        theme="outline"

                    />
                </div>
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