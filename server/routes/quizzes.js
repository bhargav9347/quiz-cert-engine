import express from 'express';
import multer from 'multer';
import path from 'path';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer config for question images
const storage = multer.diskStorage({
    destination: 'server/uploads/',
    filename: (req, file, cb) => {
        cb(null, `q-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// GET /api/quizzes (published quizzes for students)
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, title, description, time_limit, passing_score FROM quizzes WHERE is_published = TRUE');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/quizzes/my (Instructor/Admin quizzes)
router.get('/my', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
    try {
        let query = 'SELECT * FROM quizzes';
        let params = [];
        if (req.session.user.role !== 'admin') {
            query += ' WHERE created_by = ?';
            params.push(req.session.user.id);
        }
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/quizzes/:id (Full quiz details)
router.get('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [quiz] = await db.query('SELECT * FROM quizzes WHERE id = ?', [id]);
        if (quiz.length === 0) return res.status(404).json({ error: 'Quiz not found' });

        const [questions] = await db.query('SELECT * FROM questions WHERE quiz_id = ?', [id]);

        // Fetch options for each question
        for (let q of questions) {
            const [opts] = await db.query('SELECT id, option_text, is_correct FROM options WHERE question_id = ?', [q.id]);
            // If student, don't send is_correct
            if (req.session.user.role === 'student') {
                q.options = opts.map(o => ({ id: o.id, option_text: o.option_text }));
            } else {
                q.options = opts;
            }
        }

        res.json({ ...quiz[0], questions });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/quizzes (Create quiz)
router.post('/', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
    const { title, description, time_limit, passing_score } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO quizzes (title, description, time_limit, passing_score, created_by) VALUES (?, ?, ?, ?, ?)',
            [title, description, time_limit, passing_score, req.session.user.id]
        );
        res.status(201).json({ id: result.insertId, message: 'Quiz created' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// POST /api/quizzes/:id/questions
router.post('/:id/questions', requireAuth, requireRole('admin', 'instructor'), upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { question_text, options } = req.body; // options is a JSON string from form-data
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        let parsedOptions;
        try {
            parsedOptions = JSON.parse(options);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid options format' });
        }

        const [qResult] = await db.query(
            'INSERT INTO questions (quiz_id, question_text, image_url) VALUES (?, ?, ?)',
            [id, question_text, imageUrl]
        );
        const questionId = qResult.insertId;

        for (let opt of parsedOptions) {
            await db.query(
                'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
                [questionId, opt.text, opt.isCorrect]
            );
        }

        res.status(201).json({ message: 'Question added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// PATCH /api/quizzes/:id/publish
router.patch('/:id/publish', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
    const { id } = req.params;
    const { is_published } = req.body;
    try {
        await db.query('UPDATE quizzes SET is_published = ? WHERE id = ?', [is_published, id]);
        res.json({ message: 'Quiz status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE /api/quizzes/:id
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM quizzes WHERE id = ?', [id]);
        res.json({ message: 'Quiz deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
