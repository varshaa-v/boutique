const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(requireRole('admin'));

// ---------- Dashboard ----------
router.get('/dashboard', (req, res) => {
  const stats = {
    totalOrders: db.prepare('SELECT COUNT(*) c FROM orders').get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM orders WHERE status='pending'").get().c,
    inProgress: db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('assigned','in_progress')").get().c,
    completed: db.prepare("SELECT COUNT(*) c FROM orders WHERE status='completed'").get().c,
    openQueries: db.prepare("SELECT COUNT(*) c FROM queries WHERE status='open'").get().c,
    tailorCount: db.prepare("SELECT COUNT(*) c FROM users WHERE role='tailor'").get().c,
    customerCount: db.prepare("SELECT COUNT(*) c FROM users WHERE role='customer'").get().c,
  };

  const upcomingDeadlines = db.prepare(`
    SELECT o.*, u.name as customer_name, t.name as tailor_name
    FROM orders o
    JOIN users u ON u.id = o.customer_id
    LEFT JOIN users t ON t.id = o.tailor_id
    WHERE o.status NOT IN ('completed','cancelled')
    ORDER BY o.due_date ASC LIMIT 6
  `).all();

  const recentQueries = db.prepare(`
    SELECT q.*, o.garment_type, t.name as tailor_name
    FROM queries q
    JOIN orders o ON o.id = q.order_id
    JOIN users t ON t.id = q.tailor_id
    WHERE q.status='open'
    ORDER BY q.created_at DESC LIMIT 5
  `).all();

  res.render('admin/dashboard', { stats, upcomingDeadlines, recentQueries });
});

// ---------- Tailors ----------
router.get('/tailors', (req, res) => {
  const tailors = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM orders o WHERE o.tailor_id = u.id AND o.status IN ('assigned','in_progress')) as active_orders
    FROM users u WHERE u.role='tailor' ORDER BY u.name
  `).all();
  res.render('admin/tailors', { tailors });
});

router.post('/tailors', (req, res) => {
  const { name, email, password, phone, capacity_per_week, specialization } = req.body;
  db.prepare(`
    INSERT INTO users (name, email, password, role, phone, capacity_per_week, specialization)
    VALUES (?, ?, ?, 'tailor', ?, ?, ?)
  `).run(name, email, bcrypt.hashSync(password, 10), phone, capacity_per_week || 5, specialization);
  res.redirect('/admin/tailors');
});

// ---------- Fabrics ----------
router.get('/fabrics', (req, res) => {
  const fabrics = db.prepare('SELECT * FROM fabrics ORDER BY name').all();
  res.render('admin/fabrics', { fabrics });
});

router.post('/fabrics', (req, res) => {
  const { name, color, type, quantity_meters } = req.body;
  db.prepare('INSERT INTO fabrics (name, color, type, quantity_meters) VALUES (?, ?, ?, ?)')
    .run(name, color, type, quantity_meters || 0);
  res.redirect('/admin/fabrics');
});

router.post('/fabrics/:id/restock', (req, res) => {
  const { add_meters } = req.body;
  db.prepare('UPDATE fabrics SET quantity_meters = quantity_meters + ? WHERE id = ?')
    .run(parseFloat(add_meters) || 0, req.params.id);
  res.redirect('/admin/fabrics');
});

// ---------- Orders ----------
router.get('/orders', (req, res) => {
  const statusFilter = req.query.status;
  let query = `
    SELECT o.*, u.name as customer_name, t.name as tailor_name, f.name as fabric_name
    FROM orders o
    JOIN users u ON u.id = o.customer_id
    LEFT JOIN users t ON t.id = o.tailor_id
    LEFT JOIN fabrics f ON f.id = o.fabric_id
  `;
  const params = [];
  if (statusFilter) {
    query += ' WHERE o.status = ?';
    params.push(statusFilter);
  }
  query += ' ORDER BY o.due_date ASC';
  const orders = db.prepare(query).all(...params);
  res.render('admin/orders', { orders, statusFilter: statusFilter || '' });
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as customer_name, u.phone as customer_phone, t.name as tailor_name
    FROM orders o
    JOIN users u ON u.id = o.customer_id
    LEFT JOIN users t ON t.id = o.tailor_id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).send('Order not found');

  // Tailors with their current active-order load, so admin can see capacity at a glance
  const tailors = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM orders o WHERE o.tailor_id = u.id AND o.status IN ('assigned','in_progress')) as active_orders
    FROM users u WHERE u.role='tailor' ORDER BY u.name
  `).all();

  const fabrics = db.prepare('SELECT * FROM fabrics ORDER BY name').all();
  const queries = db.prepare('SELECT * FROM queries WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id);

  res.render('admin/order_detail', { order, tailors, fabrics, queries });
});

router.post('/orders/:id/assign', (req, res) => {
  const { tailor_id, fabric_id, fabric_allocated_meters, due_date, priority } = req.body;
  const meters = parseFloat(fabric_allocated_meters) || 0;

  if (fabric_id && meters > 0) {
    const fabric = db.prepare('SELECT * FROM fabrics WHERE id = ?').get(fabric_id);
    if (fabric && fabric.quantity_meters >= meters) {
      db.prepare('UPDATE fabrics SET quantity_meters = quantity_meters - ? WHERE id = ?').run(meters, fabric_id);
    }
  }

  db.prepare(`
    UPDATE orders SET tailor_id = ?, fabric_id = ?, fabric_allocated_meters = ?,
      due_date = COALESCE(?, due_date), priority = COALESCE(?, priority), status = 'assigned'
    WHERE id = ?
  `).run(tailor_id || null, fabric_id || null, meters, due_date || null, priority || null, req.params.id);

  res.redirect('/admin/orders/' + req.params.id);
});

router.post('/orders/:id/cancel', (req, res) => {
  db.prepare("UPDATE orders SET status='cancelled' WHERE id = ?").run(req.params.id);
  res.redirect('/admin/orders');
});

// ---------- Queries ----------
router.get('/queries', (req, res) => {
  const queries = db.prepare(`
    SELECT q.*, o.garment_type, o.due_date, t.name as tailor_name, u.name as customer_name
    FROM queries q
    JOIN orders o ON o.id = q.order_id
    JOIN users t ON t.id = q.tailor_id
    JOIN users u ON u.id = o.customer_id
    ORDER BY (q.status='open') DESC, q.created_at DESC
  `).all();
  res.render('admin/queries', { queries });
});

router.post('/queries/:id/resolve', (req, res) => {
  const { admin_response } = req.body;
  db.prepare(`
    UPDATE queries SET status='resolved', admin_response=?, resolved_at=datetime('now') WHERE id=?
  `).run(admin_response, req.params.id);
  res.redirect('/admin/queries');
});

// ---------- Messages ----------
router.get('/messages', (req, res) => {
  const people = db.prepare("SELECT id, name, role FROM users WHERE role IN ('tailor','customer') ORDER BY role, name").all();
  const sent = db.prepare(`
    SELECT m.*, u.name as receiver_name FROM messages m JOIN users u ON u.id = m.receiver_id
    WHERE m.sender_id = ? ORDER BY m.created_at DESC LIMIT 30
  `).all(req.session.user.id);
  res.render('admin/messages', { people, sent });
});

router.post('/messages', (req, res) => {
  const { receiver_id, subject, message, order_id } = req.body;
  db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, order_id, subject, message) VALUES (?, ?, ?, ?, ?)
  `).run(req.session.user.id, receiver_id, order_id || null, subject, message);
  res.redirect('/admin/messages');
});

// ---------- Customers (view-only list for admin) ----------
router.get('/customers', (req, res) => {
  const customers = db.prepare(`
    SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = u.id) as order_count
    FROM users u WHERE u.role='customer' ORDER BY u.name
  `).all();
  res.render('admin/customers', { customers });
});

router.get('/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM users WHERE id=? AND role="customer"').get(req.params.id);
  const measurement = db.prepare('SELECT * FROM measurements WHERE customer_id=?').get(req.params.id);
  const orders = db.prepare('SELECT * FROM orders WHERE customer_id=? ORDER BY due_date').all(req.params.id);
  res.render('admin/customer_detail', { customer, measurement, orders });
});

module.exports = router;
