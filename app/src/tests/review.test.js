import request from 'supertest';
import app from '../server.js';
import { pool } from '../db.js';

async function getDemoPropertyId() {
	const r = await pool.query('SELECT id FROM properties ORDER BY created_at ASC LIMIT 1');
	return r.rows[0].id;
}

describe('Review API', () => {
	beforeAll(async () => {
		// Small delay if running right after container start
		await new Promise(r => setTimeout(r, 200));
	});

	test('should reject invalid rating', async () => {
		const property_id = await getDemoPropertyId();
		const res = await request(app).post('/api/reviews').send({
			property_id,
			user_name: 'Shruti',
			overall_rating: 10,
			structured: {},
			body: 'This is a valid length body.'
		});
		expect(res.status).toBe(400);
	});

	test('should hold short review for moderation', async () => {
		const property_id = await getDemoPropertyId();
		const res = await request(app).post('/api/reviews').send({
			property_id,
			user_name: 'Shruti',
			overall_rating: 4,
			structured: {},
			body: 'Too short'
		});
		expect(res.status).toBe(200);
		expect(res.body.status).toBe('pending');
	});

	test('should update top_5_reviews on publish', async () => {
		const property_id = await getDemoPropertyId();
		const createdIds = [];
		for (let i = 0; i < 6; i++) {
			const res = await request(app).post('/api/reviews').send({
				property_id,
				user_name: 'User' + i,
				overall_rating: 5,
				structured: {},
				body: 'Excellent stay and friendly staff ' + i
			});
			createdIds.push(res.body.review.id);
		}
		for (const id of createdIds) {
			await request(app).post(`/api/reviews/${id}/publish`).send();
		}
		const top = await request(app).get(`/api/properties/${property_id}/top5`).send();
		expect(top.status).toBe(200);
		expect(Array.isArray(top.body.top_5_reviews)).toBe(true);
		expect(top.body.top_5_reviews.length).toBeLessThanOrEqual(5);
	});

	afterAll(async () => {
		await pool.end();
	});
});


