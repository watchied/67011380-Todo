require("dotenv").config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const upload = multer({ dest: 'uploads/' });
const app = express();
const axios = require('axios');
const port = 5001;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
app.use('/uploads', express.static('uploads'));
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database,
    port: process.env.port
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database.');
});

// ------------------------------------
// API: Authentication
// ------------------------------------
app.post('/api/login', async (req, res) => {
    const { username, password, captchaToken } = req.body;
    if (!username || !password || !captchaToken) {
        console.log(captchaToken);
        return res.status(400).json({ message: 'Missing credentials or captcha' });
    }

    try {
        // ✅ VERIFY CAPTCHA
        const captchaResponse = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: captchaToken
                }
            }
        );

        if (!captchaResponse.data.success) {
            return res.status(400).json({ message: 'CAPTCHA verification failed' });
        }

        // ✅ EXISTING LOGIN LOGIC
        db.query(
            'SELECT * FROM users WHERE username = ?',
            [username],
            async (err, results) => {
                if (results.length === 0) {
                    return res.status(401).json({ message: 'Invalid username or password' });
                }

                const user = results[0];
                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid username or password' });
                }

                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        fullName: user.full_name,
                        profileImage: user.profile_image
                    }
                });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/google-login', async (req, res) => {
    const { token, profileImage } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }

    try {
        // 1. Verify the token with Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, 
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;
        
        // 2. Check if user exists in your MySQL DB
        // Using email or a specific 'google_id' column is recommended
        db.query(
            'SELECT * FROM users WHERE username = ? OR username = ?',
            [email, googleId],
            (err, results) => {
                if (err) return res.status(500).json({ message: 'Database error' });

                if (results.length > 0) {
                    const user = results[0];
                    db.query(
                        'UPDATE users SET profile_image = ? WHERE id = ?',
                        [profileImage, user.id],
                        (updateErr) => {
                            if (updateErr) console.error('Error updating profile image:', updateErr);
                            
                            return res.json({
                                success: true,
                                user: {
                                    id: user.id,
                                    username: user.full_name,
                                    fullName: user.full_name,
                                    profileImage: profileImage // ส่ง URL รูปกลับไปให้ Frontend
                                }
                            });
                        }
                    );
                } else {
                    // User doesn't exist, create a new record
                    // Note: password can be null or a random string for OAuth users
                    db.query(
                        'INSERT INTO users (full_name, username, password, profile_image) VALUES (?, ?, ?, ?)',
                        [name, email, 'OAUTH_USER_NO_PASSWORD', profileImage],
                        (err, result) => {
                            if (err) return res.status(500).json({ message: 'Error creating user' });
                            
                            res.json({
                                success: true,
                                user: {
                                    id: result.insertId,
                                    username: email,
                                    fullName: name,
                                    profileImage: profileImage // ส่ง URL รูปกลับไปให้ Frontend
                                }
                            });
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.error('Google Verify Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
});
// ------------------------------------
// API: Todo List (Updated for Statuses)
// ------------------------------------

// 1. READ: Added target_datetime to SELECT
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;

    // ดึงงานที่เราเป็นคนสร้าง (username) 
    // หรือ งานที่เราถูก Assign (เช็คผ่านตารางกลาง โดยหาจากชื่อ user ของเรา)
    const sql = `
        SELECT t.* FROM todo t
        LEFT JOIN task_assignments ta ON t.id = ta.todo_id
        LEFT JOIN users u ON ta.user_id = u.id
        WHERE (t.username = ? OR u.username = ?) 
        AND t.team_id IS NULL
        GROUP BY t.id`;

    db.query(sql, [username, username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. CREATE: Added target_datetime to INSERT
app.post('/api/todos', (req, res) => {
    // ปรับมารับค่า assigned_to (ID ตัวเลขตัวเดียว) จาก Frontend
    const { username, task, target_datetime, team_id, assigned_to } = req.body; 

    // เพิ่ม assigned_to เข้าไปในคำสั่ง SQL หลัก
    const sql = 'INSERT INTO todo (username, task, status, target_datetime, team_id, assigned_to) VALUES (?, ?, "Todo", ?, ?, ?)';
    
    db.query(sql, [username, task, target_datetime, team_id || null, assigned_to || null], (err, result) => {
        if (err) return res.status(500).send(err);
        
        res.status(201).send({ 
            success: true, 
            id: result.insertId,
            message: 'Task created successfully' 
        });
    });
});
app.put('/api/todos/:id/status', (req, res) => {
    const todoId = req.params.id;
    const currentUserId = req.body.user_id;

    // เช็คในตาราง assignments
    const sql = 'SELECT * FROM task_assignments WHERE todo_id = ? AND user_id = ?';
    db.query(sql, [todoId, currentUserId], (err, results) => {
        if (results.length > 0 || req.body.is_admin) {
            // ถ้ามีชื่อติดในงานนี้ หรือเป็น Admin ให้แก้ไขได้
            // ... (โค้ด UPDATE UPDATE todo SET status = ...)
        } else {
            res.status(403).send("คุณไม่มีสิทธิ์แก้ไขงานนี้");
        }
    });
});
// 3. UPDATE: Change status to 'Todo', 'Doing', or 'Done'
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Validate that the status is one of the three allowed values
    const allowedStatuses = ['Todo', 'Doing', 'Done'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).send({ message: 'Invalid status value' });
    }

    const sql = 'UPDATE todo SET status = ? WHERE id = ?';
    db.query(sql, [status, id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Todo not found' });
        }
        res.send({ message: 'Status updated successfully' });
    });
});


// 4. DELETE: Remains the same
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM todo WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ message: 'Todo deleted successfully' });
    });
});



app.post('/api/register', upload.single('profileImage'), async (req, res) => {
    const { fullName, username, password, captchaToken } = req.body;

    if (!fullName || !username || !password || !captchaToken) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const captchaResponse = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: captchaToken
                }
            }
        );

        if (!captchaResponse.data.success) {
            return res.status(400).json({ message: 'CAPTCHA verification failed' });
        }
        db.query(
            'SELECT id FROM users WHERE username = ?',
            [username],
            async (err, results) => {
                if (results.length > 0) {
                    return res.status(400).json({ message: 'Username already exists' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const profileImage = req.file ? req.file.filename : null;

                db.query(
                    `INSERT INTO users (full_name, username, password, profile_image)
                     VALUES (?, ?, ?, ?)`,
                    [fullName, username, hashedPassword, profileImage],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ message: 'Database error' });
                        }

                        res.status(201).json({
                            success: true,
                            message: 'User registered successfully'
                        });
                    }
                );
            }
        );
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

//team section
// 1. สร้างทีมใหม่
app.post('/api/teams', (req, res) => {
    console.log("Received team creation request:", req.body);
    const { team_name, creator_username } = req.body;

    // 1. ค้นหา user_id จาก username (เพราะตาราง teams ต้องการ admin_id เป็น int)
    const findUserSql = 'SELECT id FROM users WHERE username = ?';
    db.query(findUserSql, [creator_username], (err, userResults) => {
        if (err || userResults.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const adminId = userResults[0].id;

        // 2. บันทึกลงตาราง teams (ใช้ชื่อ admin_id ตามรูป 1)
        const sqlTeam = 'INSERT INTO teams (team_name, admin_id) VALUES (?, ?)';
        db.query(sqlTeam, [team_name, adminId], (teamErr, teamResult) => {
            if (teamErr) return res.status(500).json(teamErr);

            const teamId = teamResult.insertId;

            // 3. บันทึกลงตาราง team_members (ใช้ team_id และ user_id ตามรูป 2)
            const sqlMember = 'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, "admin")';
            db.query(sqlMember, [teamId, adminId], (memberErr) => {
                if (memberErr) return res.status(500).json(memberErr);
                
                res.status(201).json({ success: true, message: 'Team created successfully' });
            });
        });
    });
});

// เพิ่ม API สำหรับดึงรายชื่อทีม (สำหรับแสดงใน Sidebar)
app.get('/api/teams/:username', (req, res) => {
    const { username } = req.params;
    const sql = `
        SELECT t.id, t.team_name, tm.role 
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        JOIN users u ON u.id = tm.user_id
        WHERE u.username = ?`;
    
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/teams/:teamId/todos', (req, res) => {
    const { teamId } = req.params;
    
    // ดึงงานพร้อมกับรายชื่อผู้ที่ถูก Assign (รวมกลุ่มเป็น String)
    const sql = `
        SELECT t.*, 
        GROUP_CONCAT(u.username) as assigned_names,
        GROUP_CONCAT(u.id) as assigned_uids
        FROM todo t
        LEFT JOIN task_assignments ta ON t.id = ta.todo_id
        LEFT JOIN users u ON ta.user_id = u.id
        WHERE t.team_id = ?
        GROUP BY t.id
    `;

    db.query(sql, [teamId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.get('/api/users/search/:username', (req, res) => {
    const { username } = req.params;
    db.query('SELECT id, username, full_name, profile_image FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
    });
});

app.get('/api/teams/:team_id/members', (req, res) => {
    const { team_id } = req.params;

    // เราต้อง JOIN ตาราง users เพื่อเอา "ชื่อ" มาแสดง แทนที่จะเห็นแค่ "ตัวเลข ID"
    const sql = `
        SELECT 
            u.id as user_id, 
            u.username, 
            u.full_name, 
            tm.role 
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = ?`;
    
    db.query(sql, [team_id], (err, results) => {
        if (err) {
            console.error("Error fetching members:", err);
            return res.status(500).json({ error: "Database error" });
        }
        // ส่งรายชื่อสมาชิกกลับไปแสดงผลที่หน้าจอ
        res.json(results);
    });
});

// 2. เพิ่มสมาชิกใหม่เข้าทีม
app.post('/api/teams/invite', (req, res) => {
    const { team_id, user_id } = req.body; // รับ ID ที่เป็นตัวเลขมาเลย

    // ตรวจสอบก่อนว่าเขามีอยู่ในทีมหรือยัง
    db.query('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?', [team_id, user_id], (err, results) => {
        if (results.length > 0) return res.status(400).json({ message: 'User already in team' });

        const sql = 'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, "member")';
        db.query(sql, [team_id, user_id], (insErr) => {
            if (insErr) return res.status(500).json(insErr);
            res.json({ success: true, message: 'Invited successfully' });
        });
    });
});

app.delete('/api/teams/:team_id/members/:user_id', (req, res) => {
    const { team_id, user_id } = req.params;
    
    // ป้องกัน Admin ลบตัวเองออก (ควรเหลือ Admin ไว้อย่างน้อย 1 คน)
    const sql = 'DELETE FROM team_members WHERE team_id = ? AND user_id = ? AND role != "admin"';
    
    db.query(sql, [team_id, user_id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(400).json({ message: "Cannot remove admin or member not found" });
        res.json({ success: true, message: 'Member removed' });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});