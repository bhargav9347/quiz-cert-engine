import express from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { generateCertificatePDF } from '../services/pdfGenerator.js';

const router = express.Router();

// GET /api/certificates/:attemptId
router.get('/:attemptId', requireAuth, async (req, res) => {
    const { attemptId } = req.params;
    const userId = req.session.user.id;

    try {
        const { role, id: userId } = req.session.user;

        // Check if student is requesting their own, or if admin/instructor is requesting any
        let query = `
            SELECT a.*, q.title as quiz_title, u.full_name
            FROM attempts a
            JOIN quizzes q ON a.quiz_id = q.id
            JOIN users u ON a.user_id = u.id
            WHERE a.id = ? AND a.passed = TRUE
        `;
        let params = [attemptId];

        if (role === 'student') {
            query += ' AND a.user_id = ?';
            params.push(userId);
        }

        const [attempts] = await db.query(query, params);

        if (attempts.length === 0) {
            return res.status(404).json({ error: 'Certificate not found or access denied.' });
        }

        const attempt = attempts[0];

        // Check if cert already exists in DB
        const [existingCerts] = await db.query('SELECT * FROM certificates WHERE attempt_id = ?', [attemptId]);

        let certNumber;
        if (existingCerts.length > 0) {
            certNumber = existingCerts[0].certificate_number;
        } else {
            // Create new cert record
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            certNumber = `CERT-${dateStr}-${userId}-${attemptId}`;
            await db.query('INSERT INTO certificates (attempt_id, certificate_number) VALUES (?, ?)', [attemptId, certNumber]);
        }

        // Generate PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Certificate-${certNumber}.pdf`);

        await generateCertificatePDF({
            fullName: attempt.full_name,
            quizTitle: attempt.quiz_title,
            score: attempt.score,
            certNumber: certNumber,
            date: attempt.attempted_at
        }, res);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate certificate' });
    }
});

// Verification route
router.get('/verify/:certNumber', async (req, res) => {
    const { certNumber } = req.params;
    try {
        const [rows] = await db.query(`
      SELECT c.*, u.full_name, q.title as quiz_title, a.score, a.passed
      FROM certificates c
      JOIN attempts a ON c.attempt_id = a.id
      JOIN users u ON a.user_id = u.id
      JOIN quizzes q ON a.quiz_id = q.id
      WHERE c.certificate_number = ?
    `, [certNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Invalid certificate number' });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

export default router;
