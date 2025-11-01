import express from 'express';
import { pool, withTransaction, updateTop5Reviews } from '../db.js';
import { z } from 'zod';

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Review management endpoints
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Review'
 *     responses:
 *       201:
 *         description: Review created and published
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [published]
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       200:
 *         description: Review held for moderation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: held for moderation
 *                 status:
 *                   type: string
 *                   enum: [pending]
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

const router = express.Router();

const reviewSchema = z.object({
	property_id: z.string().uuid(),
	user_name: z.string().min(1),
	overall_rating: z.number().int().min(1).max(5),
	structured: z.record(z.any()).optional().default({}),
	body: z.string().min(1)
});

async function passesFraudCheck({ user_name, body }) {
	if (!body || body.length < 10) return false;
	const { rows } = await pool.query(
		`SELECT COUNT(*)::int AS count FROM reviews WHERE user_name = $1 AND created_at >= now() - interval '24 hours'`,
		[user_name]
	);
	return rows[0].count <= 3;
}

router.post('/', async (req, res, next) => {
	try {
		const parsed = reviewSchema.safeParse(req.body);
		if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
		const data = parsed.data;

		const prop = await pool.query('SELECT id FROM properties WHERE id = $1', [data.property_id]);
		if (prop.rowCount === 0) return res.status(400).json({ error: 'property not found' });

		const shouldAutoPublish = await passesFraudCheck(data);

		const created = await withTransaction(async (client) => {
			const status = shouldAutoPublish ? 'published' : 'pending';
			const insert = await client.query(
				`INSERT INTO reviews (property_id, user_name, overall_rating, structured, body, status)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 RETURNING id, property_id, user_name, overall_rating, structured, body, status, created_at`,
				[data.property_id, data.user_name, data.overall_rating, data.structured ?? {}, data.body, status]
			);
			if (status === 'published') {
				await updateTop5Reviews(data.property_id, client);
			}
			return insert.rows[0];
		});

		if (!shouldAutoPublish) {
			return res.status(200).json({ message: 'held for moderation', status: 'pending', review: created });
		}
		return res.status(201).json({ status: 'published', review: created });
	} catch (err) {
		next(err);
	}
});

/**
 * @swagger
 * /api/reviews/{id}/publish:
 *   post:
 *     summary: Publish a pending review
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review published successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 property_id:
 *                   type: string
 *                   format: uuid
 *                 top_5_reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/publish', async (req, res, next) => {
	try {
		const reviewId = req.params.id;
		const updated = await withTransaction(async (client) => {
			const r = await client.query("UPDATE reviews SET status = 'published' WHERE id = $1 RETURNING property_id", [reviewId]);
			if (r.rowCount === 0) return null;
			const propertyId = r.rows[0].property_id;
			await updateTop5Reviews(propertyId, client);
			const prop = await client.query('SELECT id AS property_id, top_5_reviews FROM properties WHERE id = $1', [propertyId]);
			return prop.rows[0];
		});
		if (!updated) return res.status(404).json({ error: 'review not found' });
		return res.json({ property_id: updated.property_id, top_5_reviews: updated.top_5_reviews });
	} catch (err) {
		next(err);
	}
});

export default router;


