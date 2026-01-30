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
                        fullName: user.full_name
                    }
                });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// ------------------------------------
// API: Todo List (Updated for Statuses)
// ------------------------------------

// 1. READ: Added target_datetime to SELECT
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;
    const sql = 'SELECT id, task, status, updated, target_datetime FROM todo WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. CREATE: Added target_datetime to INSERT
app.post('/api/todos', (req, res) => {
    const { username, task, target_datetime } = req.body; // Receive date from frontend
    const sql = 'INSERT INTO todo (username, task, status, target_datetime) VALUES (?, ?, "Todo", ?)';
    db.query(sql, [username, task, target_datetime], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send({
            id: result.insertId,
            username,
            task,
            status: 'Todo',
            target_datetime,
            updated: new Date()
        });
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

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
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