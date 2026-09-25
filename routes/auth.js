const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect(`/${req.session.user.role}/dashboard`);
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(`/${req.session.user.role}/dashboard`);
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Invalid email or password.' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect(`/${user.role}/dashboard`);
});

// Customers can self-register. Staff/admin accounts are created by the admin.
router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.render('register', { error: 'An account with this email already exists.' });

  const hashed = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, 'customer', ?)
  `).run(name, email, hashed, phone);

  db.prepare(`INSERT INTO measurements (customer_id) VALUES (?)`).run(info.lastInsertRowid);

  req.session.user = { id: info.lastInsertRowid, name, email, role: 'customer' };
  res.redirect('/customer/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
