import React, { useState, useRef } from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";
const API_URL = process.env.REACT_APP_API_URL;

function CreateNewAdmin({ onSuccess, onBack }) {
    const recaptchaRef = useRef(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role] = useState('admin');
    const [skills, setSkills] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const handleLoginFail = async () => {
        setCaptchaToken(null);
        if (recaptchaRef.current) {
            recaptchaRef.current.reset();
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!fullName || !username || !password || !role) {
            setError('Please fill in all required fields.');
            handleLoginFail();
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            handleLoginFail();
            return;
        }
        if (!captchaToken) {
            setError("Please verify that you are not a robot.");
            return;
        }
        if (role === 'assignee' && !skills) {
            setError('Please specify your skills/expertise.');
            return;
        }
        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role', role); // เพิ่ม role
        formData.append('skills', role === 'assignee' ? skills : ''); // ส่ง skills ถ้าเป็น assignee
        formData.append("captchaToken", captchaToken);
        if (profileImage) {
            formData.append('profileImage', profileImage);
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Registration failed.');
                handleLoginFail();
                return;
            }

            onSuccess();
        } catch (err) {
            //console.error('LOGIN ERROR:', err);
            setError('Network error: Could not connect to server.');
        }
    };

    return (
        <div className="text-center">
            <h4 className="fw-bold mb-2">Create New Admin</h4>
            <p className="text-muted small mb-4">
                Create your CEI Todo account
            </p>

            <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">
                        Full Name
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Rick Astley"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                </div>

                {/* Username */}
                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">
                        Username
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. rick_astley"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                </div>

                {/* Password */}
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
                
                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">
                        Profile Image
                    </label>
                    <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => setProfileImage(e.target.files[0])}
                    />
                </div>

                {error && (
                    <div className="alert alert-danger py-2 small">
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
                <button type="submit" className="btn btn-primary w-100 py-2 mt-2">
                    Create Account
                </button>
                <div className="d-flex justify-content-end mt-3">
                    <span
                        className="small text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={onBack}
                    >
                        Already have an account? Login
                    </span>
                </div>
            </form>
        </div>
    );
}

export default CreateNewAdmin;