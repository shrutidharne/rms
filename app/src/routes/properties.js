import express from 'express';
import { pool } from '../db.js';

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management endpoints
 */

/**
 * @swagger
 * /api/properties/{id}/top5:
 *   get:
 *     summary: Get top 5 reviews for a property
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property's top 5 reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 property_id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 top_5_reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *       404:
 *         description: Property not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

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


