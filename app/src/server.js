import dotenv from 'dotenv';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import reviewsRouter from './routes/reviews.js';
import propertiesRouter from './routes/properties.js';
import { specs } from './swagger.js';

dotenv.config();

const app = express();
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Root endpoint: give a friendly message instead of a 404 for '/'
app.get('/', (req, res) => {
	res.json({
		message: 'RMS API is running. Use /api/reviews or /api/properties. See README.md for example curl requests.'
	});
});

app.use('/api/reviews', reviewsRouter);
app.use('/api/properties', propertiesRouter);

app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
	app.listen(port, () => console.log(`RMS listening on port ${port}`));
}

export default app;

