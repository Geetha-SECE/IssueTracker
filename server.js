require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const apiRoutes = require('./routes/api.js');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).type('text').send('Not Found'));

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/issuetracker')
    .then(() => {
      app.listen(PORT, () => console.log(`Issue Tracker listening on port ${PORT}`));
    })
    .catch(err => console.error(err));
}

module.exports = app;
