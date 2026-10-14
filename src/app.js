require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware global ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Frontend (static) ----
app.use(express.static(path.join(__dirname, '../public')));

// ---- API ----
app.use('/api', routes);

// ---- Error handling (wajib terakhir) ----
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server TokoKita aktif di http://localhost:${PORT}`);
  });
}

module.exports = app;
