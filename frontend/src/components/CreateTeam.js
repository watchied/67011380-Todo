import React, { useState } from 'react';

// รับ props onBack มาเพื่อใช้สำหรับกดกลับไปหน้า TodoList
function CreateTeam({ username, onBack }) {
    const [teamName, setTeamName] = useState('');
    const API_URL = process.env.REACT_APP_API_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!teamName.trim()) return;

        try {
            console.log("Creating team:", teamName);
            const response = await fetch(`${API_URL}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_name: teamName,
                    creator_username: username
                }),
            });

            if (response.ok) {
                alert('Team created successfully!');
                onBack();
            }
        } catch (err) {
            console.error('Error creating team:', err);
        }
    };

    return (
        <div className="container py-4">
            <div className="d-flex align-items-center mb-4">
                <button className="btn btn-link text-dark p-0 me-3" onClick={onBack}>
                    <i className="bi bi-arrow-left" style={{ fontSize: '1.5rem' }}></i>
                </button>
                <h3 className="fw-bold mb-0">Create a New Team</h3>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="form-label text-muted small fw-bold">TEAM NAME</label>
                    <input
                        type="text"
                        className="form-control form-control-lg rounded-3"
                        placeholder="Enter team name..."
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                    />
                </div>
                
                <div className="d-grid gap-2">
                    <button type="submit" className="btn btn-primary btn-lg rounded-3 shadow-sm">
                        Create Team
                    </button>
                    <button type="button" className="btn btn-light btn-lg rounded-3" onClick={onBack}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// *** สำคัญมาก: ต้องมีบรรทัดนี้ด้านล่างสุด ***
export default CreateTeam;