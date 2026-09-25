require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');

const { attachUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Sessions are kept in memory (fine for local/dev use and a single free-tier
// web instance). This means everyone is logged out if the server restarts -
// acceptable for a college project / small boutique. If you later need
// sessions to survive restarts, swap this for a persistent store.
app.use(session({
  secret: process.env.SESSION_SECRET || 'boutique-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

app.use(attachUser);

app.use('/', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/tailor', require('./routes/tailor'));
app.use('/customer', require('./routes/customer'));

app.use((req, res) => res.status(404).render('404'));

app.listen(PORT, () => {
  console.log(`\nBoutique Management System running at http://localhost:${PORT}\n`);
});
