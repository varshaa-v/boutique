const express = require('express');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(requireRole('tailor'));

router.get('/dashboard', (req, res) => {
  const tailorId = req.session.user.id;

  const orders = db.prepare(`
    SELECT o.*, u.name as customer_name, u.phone as customer_phone, f.name as fabric_name
    FROM orders o
    JOIN users u ON u.id = o.customer_id
    LEFT JOIN fabrics f ON f.id = o.fabric_id
    WHERE o.tailor_id = ? AND o.status NOT IN ('completed','cancelled')
    ORDER BY o.due_date ASC
  `).all(tailorId);

  const completedCount = db.prepare(`
    SELECT COUNT(*) c FROM orders WHERE tailor_id = ? AND status = 'completed'
  `).get(tailorId).c;

  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(tailorId);

  res.render('tailor/dashboard', { orders, completedCount, me });
});

router.post('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND tailor_id=?').get(req.params.id, req.session.user.id);
  if (!order) return res.status(403).send('Not your order.');
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
  res.redirect('/tailor/dashboard');
});

router.get('/queries', (req, res) => {
  const queries = db.prepare(`
    SELECT q.*, o.garment_type, o.due_date FROM queries q
    JOIN orders o ON o.id = q.order_id
    WHERE q.tailor_id = ? ORDER BY q.created_at DESC
  `).all(req.session.user.id);

  const myOrders = db.prepare(`
    SELECT id, garment_type, due_date FROM orders WHERE tailor_id=? AND status NOT IN ('completed','cancelled')
  `).all(req.session.user.id);

  res.render('tailor/queries', { queries, myOrders });
});

router.post('/queries', (req, res) => {
  const { order_id, query_type, message } = req.body;
  db.prepare(`
    INSERT INTO queries (order_id, tailor_id, query_type, message) VALUES (?, ?, ?, ?)
  `).run(order_id, req.session.user.id, query_type, message);
  db.prepare(`UPDATE orders SET status='query_raised' WHERE id=?`).run(order_id);
  res.redirect('/tailor/queries');
});

router.get('/messages', (req, res) => {
  const messages = db.prepare(`
    SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.receiver_id = ? ORDER BY m.created_at DESC
  `).all(req.session.user.id);
  db.prepare('UPDATE messages SET is_read=1 WHERE receiver_id=?').run(req.session.user.id);
  res.render('tailor/messages', { messages });
});

module.exports = router;
