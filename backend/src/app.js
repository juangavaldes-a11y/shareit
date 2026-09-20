const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');

const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/error-handler');
const logger = require('./utils/logger');
const { observeRequest } = require('./utils/metrics');

const app = express();

if (env.nodeEnv === 'production') {
	app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({
	origin: env.corsOrigins,
	credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(pinoHttp({
	logger,
	genReqId: (req, res) => {
		const requestId = req.get('x-request-id') || randomUUID();
		res.setHeader('x-request-id', requestId);
		return requestId;
	},
}));
app.use(observeRequest);

if (env.nodeEnv !== 'production') {
	app.use(morgan('dev'));
}

app.use('/api/v1', routes);
app.use(errorHandler);

module.exports = app;
