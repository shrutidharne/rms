import dotenv from 'dotenv';
import express from 'express';
import reviewsRouter from './routes/reviews.js';
import propertiesRouter from './routes/properties.js';

dotenv.config();

const app = express();
app.use(express.json());

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

