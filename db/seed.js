// db/seed.js
// Run with: npm run seed
// Creates demo login accounts + sample data so you can explore the app immediately.
// Safe to re-run: it clears existing data first.

const bcrypt = require('bcryptjs');
const db = require('./db');

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

const tables = ['messages', 'queries', 'orders', 'fabrics', 'measurements', 'users'];
tables.forEach(t => db.prepare(`DELETE FROM ${t}`).run());

// ---- Users ----
const insertUser = db.prepare(`
  INSERT INTO users (name, email, password, role, phone, capacity_per_week, specialization)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const adminId = insertUser.run('Boutique Admin', 'admin@boutique.com', hash('admin123'), 'admin', '9999900000', null, null).lastInsertRowid;

const tailor1 = insertUser.run('Ramesh Kumar', 'ramesh@boutique.com', hash('tailor123'), 'tailor', '9999911111', 6, 'Blouses, Salwar suits').lastInsertRowid;
const tailor2 = insertUser.run('Suresh Babu', 'suresh@boutique.com', hash('tailor123'), 'tailor', '9999922222', 4, 'Sarees, Lehengas, Fall & pico').lastInsertRowid;

const cust1 = insertUser.run('Priya Sharma', 'priya@example.com', hash('customer123'), 'customer', '9888811111', null, null).lastInsertRowid;
const cust2 = insertUser.run('Anjali Reddy', 'anjali@example.com', hash('customer123'), 'customer', '9888822222', null, null).lastInsertRowid;

// ---- Measurements ----
const insertM = db.prepare(`
  INSERT INTO measurements (customer_id, chest, waist, hip, shoulder, sleeve_length, shirt_length, inseam, neck, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertM.run(cust1, 36, 30, 38, 14, 22, 26, 40, 14, 'Prefers slightly loose fit around waist');
insertM.run(cust2, 34, 28, 36, 13.5, 21, 25, 38, 13.5, 'Standard fit');

// ---- Fabrics ----
const insertF = db.prepare(`INSERT INTO fabrics (name, color, type, quantity_meters) VALUES (?, ?, ?, ?)`);
const fab1 = insertF.run('Cotton Print', 'Blue Floral', 'Cotton', 25).lastInsertRowid;
const fab2 = insertF.run('Silk Blend', 'Maroon', 'Silk', 15).lastInsertRowid;
const fab3 = insertF.run('Linen', 'Beige', 'Linen', 10).lastInsertRowid;

// ---- Orders ----
const insertO = db.prepare(`
  INSERT INTO orders (customer_id, tailor_id, garment_type, customization_details, design_notes, fabric_id, fabric_allocated_meters, status, priority, due_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertO.run(cust1, tailor1, 'Blouse', 'Boat neck, elbow-length sleeves, back hook closure', 'Reference image shared over WhatsApp', fab2, 1.2, 'assigned', 'high', '2026-10-05');
insertO.run(cust1, null, 'Salwar Suit', 'Straight cut, side pockets', 'Simple, minimal embroidery', null, null, 'pending', 'normal', '2026-10-15');
insertO.run(cust2, tailor2, 'Saree Fall & Pico', 'Standard fall and pico for 2 sarees', '-', fab1, 0, 'in_progress', 'normal', '2026-09-28');

// ---- Sample query from a tailor ----
db.prepare(`
  INSERT INTO queries (order_id, tailor_id, query_type, message, status)
  VALUES (1, ?, 'insufficient_fabric', 'The maroon silk blend allocated (1.2m) is short by about 0.3m for the boat neck design with lining. Please allocate more or approve a design change.', 'open')
`).run(tailor1);

console.log('Database seeded successfully.\n');
console.log('=== Demo login credentials ===');
console.log('Admin    -> admin@boutique.com / admin123');
console.log('Tailor 1 -> ramesh@boutique.com / tailor123');
console.log('Tailor 2 -> suresh@boutique.com / tailor123');
console.log('Customer 1 -> priya@example.com / customer123');
console.log('Customer 2 -> anjali@example.com / customer123');
