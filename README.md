# StitchStudio — Boutique & Tailoring Management System

A full-stack web app with 3 role-based logins — **Admin**, **Tailor/Fabric Cutter**, and **Customer** — built for a Software Engineering course project and designed to be genuinely usable for a real boutique.

---

## 1. What's included

| Role | What they can do |
|---|---|
| **Customer** | View/edit their measurements, place new order requests, view their orders (type, status, customization details, design notes), view messages from the boutique |
| **Tailor / Fabric Cutter** | View orders assigned to them sorted by deadline, update order status (assigned → in progress → completed), raise queries (insufficient fabric, insufficient thread, unable to complete, deadline extension), view messages from admin |
| **Admin** | Dashboard with live stats, add/manage tailors (with weekly capacity), manage fabric inventory & restocking, assign orders to tailors (with capacity shown), allocate fabric to orders, view & resolve tailor queries, message any tailor or customer, view all customers and their order history |

**Tech stack** (deliberately simple — one language, no build tools):
- **Backend:** Node.js + Express
- **Database:** SQLite (a single file — no separate database server to install)
- **Frontend:** EJS templates + Bootstrap 5 (server-rendered, no React/webpack to learn)
- **Auth:** express-session + bcrypt password hashing, role-based access control

---

## 2. Project structure

```
boutique-management/
├── server.js              # App entry point
├── package.json
├── .env.example            # Copy to .env
├── db/
│   ├── db.js               # DB connection + schema (auto-creates tables)
│   ├── seed.js              # Creates demo accounts + sample data
│   └── boutique.db          # Created automatically on first run
├── middleware/
│   └── auth.js              # Login/role-check middleware
├── routes/
│   ├── auth.js               # login, register, logout
│   ├── admin.js
│   ├── tailor.js
│   └── customer.js
├── views/                   # EJS pages, organized by role
│   ├── partials/
│   ├── admin/
│   ├── tailor/
│   └── customer/
└── public/css/style.css     # Custom boutique theme
```

---

## 3. Run it locally (step by step)

### Prerequisites
Install **Node.js** (v18 or newer) from https://nodejs.org — this also installs `npm`.
Check it worked:
```bash
node -v
npm -v
```

### Steps
1. **Unzip** the project and open a terminal in the `boutique-management` folder.
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```
   (On Windows Command Prompt: `copy .env.example .env`)
4. **Seed the database** with demo accounts and sample orders:
   ```bash
   npm run seed
   ```
   This prints demo login credentials in the terminal — also listed below.
5. **Start the server:**
   ```bash
   npm start
   ```
6. Open your browser at **http://localhost:3000**

### Demo logins (created by `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | admin@boutique.com | admin123 |
| Tailor | ramesh@boutique.com | tailor123 |
| Tailor | suresh@boutique.com | tailor123 |
| Customer | priya@example.com | customer123 |
| Customer | anjali@example.com | customer123 |

New customers can also self-register from the login page. Tailor and admin accounts are created by the admin (or directly via the seed script for staff you manage).

> ⚠️ These are demo passwords — change them (and the `SESSION_SECRET` in `.env`) before using this for real business data.

---

## 4. Using it for your mom's boutique (practical tips)

- **Replace the seed data**: once you're happy with the app, either edit `db/seed.js` with your real staff/fabric info and re-run `npm run seed`, or just create real accounts through the running app (admin adds tailors from the Tailors page; customers register themselves or the admin can add them similarly).
- **Fabric allocation logic**: currently the admin manually assigns tailor + fabric while seeing each tailor's active-order load vs. their weekly capacity, and the fabric stock is deducted when allocated. This is intentionally manual/practical rather than a "smart" auto-scheduler — good for a real boutique with human judgment involved, and easy to explain in your project viva.
- **Backups**: since everything lives in `db/boutique.db`, back it up by simply copying that file periodically.
- **Photos of designs**: the current version stores design notes as text. A natural extension (see Section 6) is to let customers/admin upload a reference photo — mention this as a "future enhancement" in your report if you don't implement it.

---

## 5. Deploying it for free (so it runs like a real website)

**Render.com** (free tier) is the most beginner-friendly option for a Node.js + SQLite app like this one.

### Steps:
1. Push this project to a **GitHub** repository (create one at github.com, then):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to https://render.com → sign up (free) → **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables (under "Environment"): `SESSION_SECRET` = any random string.
6. Under **Shell** (after first deploy), run `npm run seed` once to create demo accounts — or register/create accounts normally through the live site.
7. Deploy. Render gives you a free public URL like `https://your-app.onrender.com`.

**Important free-tier caveats to mention in your report:**
- Render's free web services "sleep" after inactivity and take ~30–60 seconds to wake up on the next visit — fine for a project demo, not ideal for a live business.
- Free tier storage is **not permanently persistent** across redeploys (the SQLite file can reset). For a real boutique going forward, the practical upgrade path is either Render's small paid tier with a persistent disk, or swapping SQLite for a free-tier hosted Postgres (e.g., Render's or Supabase's free Postgres) — the `db.js` file is the only place you'd need to change queries, since routes just call `db.prepare(...)`.
- For your **submission**, a Render/Railway link plus the local `npm start` instructions covers both "looks like a real deployed website" and "professor can run it locally" cases.

---

## 6. Turning this into your SE project report

Since this is for a Software Engineering subject, here's how the app maps to what's usually expected in the report/documentation — use this as a checklist:

- **Problem statement / feasibility study:** manual boutique order tracking (measurements, fabric stock, tailor allocation, deadlines) is error-prone; this system digitizes it.
- **SRS (Software Requirements Specification):** functional requirements = the role table in Section 1 above; non-functional = usability (simple dashboard), security (hashed passwords, role-based access), reliability.
- **ER Diagram** — entities and relationships to draw (e.g. in draw.io or dbdiagram.io):
  - `users` (role: admin/tailor/customer) 1—1 `measurements` (customer only)
  - `users` (customer) 1—many `orders`; `users` (tailor) 1—many `orders`
  - `fabrics` 1—many `orders`
  - `orders` 1—many `queries`; `users` (tailor) 1—many `queries`
  - `users` 1—many `messages` (as sender), 1—many `messages` (as receiver)
- **DFD (Data Flow Diagram):** Level 0 — Customer → [Boutique System] → Admin → [Boutique System] → Tailor, with fabric inventory and order status as data stores.
- **Use Case Diagram:** 3 actors (Admin, Tailor, Customer) with use cases matching the role table.
- **System architecture diagram:** Browser (EJS/Bootstrap) ↔ Express server (routes + middleware) ↔ SQLite database — a classic 3-tier architecture, good to explicitly label in your report.
- **Testing:** you can describe manual test cases per role (e.g., "Login with wrong password → error shown", "Admin allocates more fabric than in stock → currently allowed, could be tightened — good discussion point for viva").
- **SDLC model:** mention you followed an iterative/incremental approach — build auth → build one role's module at a time → integrate.

---

## 7. Good "extra feature" ideas if you have time before submission

Pick 1–2 to stand out, rather than trying all:
- Email/SMS notification when an order status changes (e.g. using a free tier of a service like Brevo).
- Design reference **image upload** for orders (using `multer` to save files).
- Fabric **low-stock auto-alert** to admin dashboard when quantity drops below a threshold (partially there already — the fabric cards turn red under 5m).
- Simple **analytics chart** on the admin dashboard (e.g. orders per week) using Chart.js.
- Convert the "manual" tailor assignment into a **suggested tailor** (system highlights the tailor with the most capacity headroom and matching specialization, admin still confirms).

---

## 8. Troubleshooting

- **"Cannot find module ..."** → run `npm install` again inside the project folder.
- **Port already in use** → change `PORT` in `.env`, or stop whatever else is using port 3000.
- **Login not working after seeding** → make sure you ran `npm run seed` (it prints the demo credentials) and are using the exact email/password from Section 3.
- **Changes to `.ejs` files not showing** → just refresh the browser; if you changed `server.js` or files in `routes/`/`db/`, stop the server (Ctrl+C) and run `npm start` again.
- **Windows: `npm install` fails on `better-sqlite3` asking for "Visual Studio" / node-gyp errors** → this happens when npm can't find a prebuilt binary for your Node version and tries to compile it from source, which needs a C++ compiler you likely don't have. Fix:
  1. Delete the `node_modules` folder and `package-lock.json` if present.
  2. Make sure `package.json` has a recent `better-sqlite3` version (`^11.x` or newer) — older versions don't ship prebuilt Windows binaries for newer Node releases.
  3. Run `npm install` again.
  If it still fails, the most reliable workaround is installing an LTS Node version (e.g. Node 20 or 22 LTS, not the very latest release) from https://nodejs.org, since prebuilt binaries lag a few weeks behind brand-new Node releases.
- **Windows: leftover files won't delete when reinstalling (`EPERM`, `.idea` folder errors)** → close any editor/IDE (like WebStorm) that has the project open, then delete the `node_modules` folder manually (or via `rmdir /s /q node_modules` in Command Prompt) before running `npm install` again.
