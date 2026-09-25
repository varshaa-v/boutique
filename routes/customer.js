const express = require('express');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(requireRole('customer'));

router.get('/dashboard', (req, res) => {
  const custId = req.session.user.id;
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY due_date').all(custId);
  const measurement = db.prepare('SELECT * FROM measurements WHERE customer_id=?').get(custId);

  const summary = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => ['assigned', 'in_progress', 'query_raised'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  res.render('customer/dashboard', { orders: orders.slice(0, 5), measurement, summary });
});

router.get('/measurements', (req, res) => {
  const measurement = db.prepare('SELECT * FROM measurements WHERE customer_id=?').get(req.session.user.id);
  res.render('customer/measurements', { measurement });
});

router.post('/measurements', (req, res) => {
  const { chest, waist, hip, shoulder, sleeve_length, shirt_length, inseam, neck, notes } = req.body;
  const existing = db.prepare('SELECT id FROM measurements WHERE customer_id=?').get(req.session.user.id);
  if (existing) {
    db.prepare(`
      UPDATE measurements SET chest=?, waist=?, hip=?, shoulder=?, sleeve_length=?, shirt_length=?, inseam=?, neck=?, notes=?, updated_at=datetime('now')
      WHERE customer_id=?
    `).run(chest, waist, hip, shoulder, sleeve_length, shirt_length, inseam, neck, notes, req.session.user.id);
  } else {
    db.prepare(`
      INSERT INTO measurements (customer_id, chest, waist, hip, shoulder, sleeve_length, shirt_length, inseam, neck, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.session.user.id, chest, waist, hip, shoulder, sleeve_length, shirt_length, inseam, neck, notes);
  }
  res.redirect('/customer/measurements');
});

router.get('/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, t.name as tailor_name, f.name as fabric_name
    FROM orders o LEFT JOIN users t ON t.id = o.tailor_id LEFT JOIN fabrics f ON f.id = o.fabric_id
    WHERE o.customer_id=? ORDER BY o.due_date
  `).all(req.session.user.id);
  res.render('customer/orders', { orders });
});

router.get('/orders/new', (req, res) => {
  res.render('customer/new_order', { error: null });
});

router.post('/orders', (req, res) => {
  const { garment_type, customization_details, design_notes, due_date, priority } = req.body;
  db.prepare(`
    INSERT INTO orders (customer_id, garment_type, customization_details, design_notes, due_date, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(req.session.user.id, garment_type, customization_details, design_notes, due_date, priority || 'normal');
  res.redirect('/customer/orders');
});

router.get('/messages', (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.receiver_id = ? ORDER BY m.created_at DESC
  `).all(req.session.user.id);
  db.prepare('UPDATE messages SET is_read=1 WHERE receiver_id=?').run(req.session.user.id);
  res.render('customer/messages', { messages });
});

module.exports = router;
