import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || 'postgres://rms:rms@localhost:5432/rms';

export const pool = new Pool({ connectionString });

export async function withTransaction(callback) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const result = await callback(client);
		await client.query('COMMIT');
		return result;
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

export async function updateTop5Reviews(propertyId, clientOrPool = pool) {
	const client = clientOrPool.query ? clientOrPool : await pool.connect();
	const shouldRelease = !clientOrPool.query;
	try {
		await client.query(
			`WITH top AS (
				SELECT id, user_name, overall_rating, structured, body, created_at
				FROM reviews
				WHERE property_id = $1 AND status = 'published'
				ORDER BY created_at DESC
				LIMIT 5
			)
			UPDATE properties p
			SET top_5_reviews = COALESCE((SELECT jsonb_agg(row_to_json(top)) FROM top), '[]'::jsonb),
				updated_at = now()
			WHERE p.id = $1;`,
			[propertyId]
		);
	} finally {
		if (shouldRelease) client.release();
	}
}


