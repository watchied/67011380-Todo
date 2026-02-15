import React, { useState, useRef, useEffect } from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";
const API_URL = process.env.REACT_APP_API_URL;

function SignUp({ onSuccess, goToLogIn }) {
    const recaptchaRef = useRef(null);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [skills, setSkills] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [selectedSkills, setSelectedSkills] = useState([]); // เก็บเป็น Array ของ ID


    const handleLoginFail = async () => {
        setCaptchaToken(null);
        if (recaptchaRef.current) {
            recaptchaRef.current.reset();
        }
    };
    useEffect(() => {
        fetch(`${API_URL}/categories`)
            .then(res => res.json())
            .then(data => setAvailableCategories(data));
    }, []);
    const handleSkillChange = (categoryId) => {
        setSelectedSkills(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
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
        if (role === 'assignee' && selectedSkills.length === 0) {
            setError('Please specify your skills/expertise.');
            return;
        }
        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('username', username);
        formData.append('password', password);
        formData.append('role', role); // เพิ่ม role
        formData.append('skills', role === 'assignee' ? JSON.stringify(selectedSkills) : '[]');
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
            <h4 className="fw-bold mb-2">Sign Up</h4>
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
                {/* Role Selection */}
                <div className="mb-3 text-start">
                    <label className="form-label small fw-bold text-secondary">Register as</label>
                    <div className="d-flex gap-3">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="role"
                                id="roleUser"
                                value="user"
                                checked={role === 'user'}
                                onChange={(e) => setRole(e.target.value)}
                            />
                            <label className="form-check-label small" htmlFor="roleUser">User (Client)</label>
                        </div>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                name="role"
                                id="roleAssignee"
                                value="assignee"
                                checked={role === 'assignee'}
                                onChange={(e) => setRole(e.target.value)}
                            />
                            <label className="form-check-label small" htmlFor="roleAssignee">Assignee (Worker)</label>
                        </div>
                    </div>
                </div>
                {role === 'assignee' && (
                    <div className="mb-3 text-start">
                        <label className="form-label small fw-bold text-secondary">Expertise (Select all that apply)</label>
                        <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {availableCategories.map(cat => (
                                <div key={cat.id} className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`cat-${cat.id}`}
                                        checked={selectedSkills.includes(cat.id)}
                                        onChange={() => handleSkillChange(cat.id)}
                                    />
                                    <label className="form-check-label small" htmlFor={`cat-${cat.id}`}>
                                        {cat.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Profile Image */}
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
                <button type="submit" className="btn btn-primary w-100 py-2">
                    Create Account
                </button>
                <div className="d-flex justify-content-end mt-3">
                    <span
                        className="small text-primary"
                        style={{ cursor: 'pointer' }}
                        onClick={goToLogIn}
                    >
                        Already have an account? Login
                    </span>
                </div>
            </form>
        </div>
    );
}

export default SignUp;