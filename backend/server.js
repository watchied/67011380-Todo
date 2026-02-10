require("dotenv").config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcrypt');
const uploadProfile = multer({ dest: 'uploads/' });

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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // เก็บไฟล์ที่โฟลเดอร์ uploads/
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // เก็บชื่อไฟล์แบบ: timestamp-ชื่อเดิม (ป้องกันชื่อซ้ำ)
        cb(null, uniqueSuffix + '-' + file.originalname)
    }
});
const uploadFile = multer({ storage: storage });
const upload = multer({ storage: storage });
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
                        profileImage: user.profile_image,
                        role: user.role,
                        skills: user.skills

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
    const { role } = req.query;

    // ลบ t.team_id ออกจาก SELECT
    let sql = `
        SELECT 
            t.id, t.username, t.task, t.status, t.target_datetime, t.assigned_to,
            u.username AS assigned_user_name,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', tf.id, 
                        'file_url', tf.file_url, 
                        'file_name', tf.file_name
                    )
                ) 
                FROM todo_files tf 
                WHERE tf.todo_id = t.id
            ) AS files
        FROM todo t
        LEFT JOIN users u ON t.assigned_to = u.id
    `;

    let queryParams = [];
    if (role !== 'admin') {
        sql += ` WHERE t.username = ? OR t.assigned_to = (SELECT id FROM users WHERE username = ?)`;
        queryParams = [username, username];
    }

    sql += ` ORDER BY t.target_datetime ASC`;

    db.query(sql, queryParams, (err, results) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json({ error: err.message }); // ส่งเป็น JSON เสมอเพื่อไม่ให้ Frontend พัง
        }
        res.json(results);
    });
});

// 2. CREATE: Added target_datetime to INSERT
app.post('/api/todos', uploadFile.array('attachments', 10), (req, res) => {
    // ข้อมูลตัวหนังสืออยู่ที่ req.body, ไฟล์ที่เป็น Array จะอยู่ที่ req.files
    const { username, task, target_datetime, assigned_to, creator_id } = req.body;
    const files = req.files; // เป็น Array ของไฟล์

    // 1. บันทึกข้อมูล Task ลงตาราง todo ก่อน
    const sqlTodo = `
        INSERT INTO todo (username, task, status, target_datetime, assigned_to) 
        VALUES (?, ?, "Todo", ?, ?)`;

    db.query(sqlTodo, [
        username,
        task,
        target_datetime,
        assigned_to === 'null' || !assigned_to ? null : assigned_to
    ], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: err.message });
        }

        const todoId = result.insertId;

        // 2. ถ้ามีไฟล์แนบมา ให้บันทึกลงตาราง todo_files
        if (files && files.length > 0) {
            const fileValues = files.map(file => [
                todoId,
                file.filename,
                file.originalname,
                creator_id || null
            ]);

            const sqlFiles = `
                INSERT INTO todo_files (todo_id, file_url, file_name, uploaded_by_id) 
                VALUES ?`;

            db.query(sqlFiles, [fileValues], (fileErr) => {
                if (fileErr) {
                    console.error("File Insert Error:", fileErr);
                    // ไม่ return error 500 ตรงนี้เพื่อให้ Task ยังถูกสร้างได้แม้ไฟล์จะพัง
                }
                res.status(201).json({ success: true, id: todoId });
            });
        } else {
            // กรณีไม่มีไฟล์
            res.status(201).json({ success: true, id: todoId });
        }
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

app.post('/api/todos/:id/upload', uploadFile.array('attachments', 10), (req, res) => {
    const todoId = req.params.id;
    const { userId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const fileValues = files.map(file => [todoId, file.filename, file.originalname, userId]);
    const sql = "INSERT INTO todo_files (todo_id, file_url, file_name, uploaded_by_id) VALUES ?";

    db.query(sql, [fileValues], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Files uploaded successfully" });
    });
});

app.post('/api/register', uploadProfile.single('profileImage'), async (req, res) => {
    // 1. รับค่า role และ skills เพิ่มเติมจาก req.body
    const { fullName, username, password, captchaToken, role, skills } = req.body;

    // ตรวจสอบฟิลด์ที่จำเป็น (เพิ่ม role เข้าไปด้วย)
    if (!fullName || !username || !password || !captchaToken || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // --- ส่วนตรวจสอบ reCAPTCHA (เหมือนเดิม) ---
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

        // --- ตรวจสอบ Username ซ้ำ ---
        db.query(
            'SELECT id FROM users WHERE username = ?',
            [username],
            async (err, results) => {
                if (err) return res.status(500).json({ message: 'Database error' });

                if (results.length > 0) {
                    return res.status(400).json({ message: 'Username already exists' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);
                const profileImage = req.file ? req.file.filename : null;

                // 2. ปรับ Query บันทึกข้อมูล (เพิ่มคอลัมน์ role และ skills)
                // หมายเหตุ: skills จะเป็นค่าว่างถ้าเลือกเป็น 'user'
                const finalSkills = role === 'assignee' ? skills : null;

                const sql = `
                    INSERT INTO users (full_name, username, password, profile_image, role, skills)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    sql,
                    [fullName, username, hashedPassword, profileImage, role, finalSkills],
                    (err) => {
                        if (err) {
                            console.error("Registration Error:", err);
                            return res.status(500).json({ message: 'Database error during insertion' });
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
        console.error("Server Error:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/users/assignees', (req, res) => {
    const sql = "SELECT id, username, skills FROM users WHERE role = 'assignee'";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch Assignees Error:", err);
            return res.status(500).json(err);
        }
        res.json(results);
    });
});

app.put('/api/todos/:id/assign', (req, res) => {
    const { id } = req.params;
    const { assigned_to } = req.body; // รับ ID ของคนที่จะเปลี่ยนไปให้

    const sql = 'UPDATE todo SET assigned_to = ? WHERE id = ?';
    db.query(sql, [assigned_to === '' ? null : assigned_to, id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true, message: 'Assignee updated' });
    });
});
//team section
// 1. สร้างทีมใหม่
/*app.post('/api/teams', (req, res) => {
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
});*/

app.get('/api/users/search/:username', (req, res) => {
    const { username } = req.params;
    db.query('SELECT id, username, full_name, profile_image FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(results[0]);
    });
});

/*app.get('/api/teams/:team_id/members', (req, res) => {
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
});*/

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});