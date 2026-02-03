const { createUser, findByEmail } = require('../models/userModel');
const bcrypt = require('bcryptjs');

exports.showRegister = (req, res) => {
  res.render('register', { errors: [], old: {} });
};

exports.register = async (req, res) => {
  const { name, email, password, password2 } = req.body;
  const errors = [];
  if (!name || !email || !password || !password2) errors.push('Todos los campos son obligatorios');
  if (password !== password2) errors.push('Las contraseñas no coinciden');
  if (password && password.length < 6) errors.push('La contraseña debe tener al menos 6 caracteres');

  if (errors.length) return res.render('register', { errors, old: { name, email } });

  try {
    const existing = await findByEmail(email);
    if (existing) return res.render('register', { errors: ['El correo ya está registrado'], old: { name, email } });

    // bcryptjs does not return promises for hash; use sync to avoid callback complexity here
    const hash = bcrypt.hashSync(password, 10);
    const user = await createUser(name, email, hash);
    req.session.user = { id: user.id, name: user.name, email: user.email };
    return res.redirect('/');
  } catch (err) {
    console.error(err);
    return res.render('register', { errors: ['Error del servidor'], old: { name, email } });
  }
};

exports.showLogin = (req, res) => {
  res.render('login', { errors: [], old: {} });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const errors = [];
  if (!email || !password) errors.push('Todos los campos son obligatorios');
  if (errors.length) return res.render('login', { errors, old: { email } });

  try {
    const user = await findByEmail(email);
    if (!user) return res.render('login', { errors: ['Credenciales inválidas'], old: { email } });
    // use sync compare for bcryptjs
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.render('login', { errors: ['Credenciales inválidas'], old: { email } });

    req.session.user = { id: user.id, name: user.name, email: user.email };
    return res.redirect('/');
  } catch (err) {
    console.error(err);
    return res.render('login', { errors: ['Error del servidor'], old: { email } });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
