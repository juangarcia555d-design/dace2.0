const express = require('express');
const router = express.Router();
const multer = require('multer');

// Logging middleware para depuración de llamadas API
router.use((req, res, next) => {
  console.log('[api] %s %s sessionUser=%s', req.method, req.path, req.session && req.session.user ? req.session.user.email : null);
  next();
});
const path = require('path');
const socialCtrl = require('../controllers/socialController');

// storage for post images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'posts'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ ok: false, error: 'No autorizado' });
  next();
}

// posts
router.get('/posts', socialCtrl.getPosts);
router.post('/posts', ensureAuth, upload.single('image'), socialCtrl.createPost);
router.post('/posts/:id/like', ensureAuth, socialCtrl.toggleLike);
router.delete('/posts/:id', ensureAuth, socialCtrl.deletePost);

// chat
router.get('/chat/messages', socialCtrl.getMessages);
router.post('/chat/messages', ensureAuth, socialCtrl.postMessage);

// diagnóstico: sesión actual
router.get('/me', (req, res) => {
  res.json({ ok: true, user: req.session && req.session.user ? req.session.user : null });
});

module.exports = router;