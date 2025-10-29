import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/:id/top5', async (req, res, next) => {
	try {
		const { id } = req.params;
		const result = await pool.query('SELECT id AS property_id, name, top_5_reviews FROM properties WHERE id = $1', [id]);
		if (result.rowCount === 0) return res.status(404).json({ error: 'property not found' });
		const row = result.rows[0];
		res.json({ property_id: row.property_id, name: row.name, top_5_reviews: row.top_5_reviews });
	} catch (err) {
		next(err);
	}
});

export default router;


