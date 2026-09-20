const app = require('./app');
const env = require('./config/env');
const { sequelize, initModels } = require('./models');

const startServer = async () => {
  try {
    initModels();
    await sequelize.authenticate();

    app.listen(env.port, () => {
      console.log(`API running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
