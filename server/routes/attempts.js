import express from 'express';
import { Parser } from 'json2csv';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/attempts/:quizId (Submit quiz)
router.post('/:quizId', requireAuth, async (req, res) => {
    const { quizId } = req.params;
    const { answers } = req.body; // Map of questionId -> optionId
    const userId = req.session.user.id;

    try {
        // Check if quiz exists and get passing score
        const [quizzes] = await db.query('SELECT passing_score FROM quizzes WHERE id = ?', [quizId]);
        if (quizzes.length === 0) return res.status(404).json({ error: 'Quiz not found' });
        const passingScore = quizzes[0].passing_score;

        // Get count of total questions in quiz
        const [totalRows] = await db.query('SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?', [quizId]);
        const totalQuestions = totalRows[0].count;

        if (totalQuestions === 0) {
            return res.status(400).json({ error: 'This quiz has no questions yet and cannot be submitted.' });
        }

        // Get all correct options for this quiz
        const [correctOptions] = await db.query(`
          SELECT q.id as question_id, o.id as option_id
          FROM questions q
          JOIN options o ON q.id = o.question_id
          WHERE q.quiz_id = ? AND o.is_correct = TRUE
        `, [quizId]);

        if (correctOptions.length === 0) {
            return res.status(400).json({ error: 'This quiz has no correct options defined. Please contact the administrator.' });
        }

        let correctCount = 0;
        correctOptions.forEach(co => {
            if (answers && answers[co.question_id] == co.option_id) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / totalQuestions) * 100);
        const passed = score >= passingScore;

        const [result] = await db.query(
            'INSERT INTO attempts (quiz_id, user_id, score, passed) VALUES (?, ?, ?, ?)',
            [quizId, userId, score, passed]
        );

        res.status(201).json({
            attemptId: result.insertId,
            score,
            passed,
            message: passed ? 'Congratulations! You passed.' : 'You did not pass. Try again!'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process attempt' });
    }
});

// GET /api/attempts/my (Student history)
router.get('/my', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT a.*, q.title as quiz_title, c.id as certificate_id
      FROM attempts a
      JOIN quizzes q ON a.quiz_id = q.id
      LEFT JOIN certificates c ON a.id = c.attempt_id
      WHERE a.user_id = ?
      ORDER BY a.attempted_at DESC
    `, [req.session.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// GET /api/attempts/quiz/:quizId (Instructor view)
router.get('/quiz/:quizId', requireAuth, requireRole('admin', 'instructor'), async (req, res) => {
    const { quizId } = req.params;
    const { format } = req.query;

    try {
        const [rows] = await db.query(`
      SELECT a.*, u.full_name, u.email, q.title as quiz_title
      FROM attempts a
      JOIN users u ON a.user_id = u.id
      JOIN quizzes q ON a.quiz_id = q.id
      WHERE a.quiz_id = ?
    `, [quizId]);

        if (format === 'csv') {
            const fields = ['full_name', 'email', 'quiz_title', 'score', 'passed', 'attempted_at'];
            const parser = new Parser({ fields });
            const csv = parser.parse(rows);
            res.header('Content-Type', 'text/csv');
            res.attachment(`attempts-quiz-${quizId}.csv`);
            return res.send(csv);
        }

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
