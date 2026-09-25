// middleware/auth.js

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    if (req.session.user.role !== role) {
      return res.status(403).send('Access denied: this page is not available for your role.');
    }
    next();
  };
}

// Makes the logged-in user available in every EJS view as `currentUser`
function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

module.exports = { requireLogin, requireRole, attachUser };
