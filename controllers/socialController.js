const db = require('../db');
const path = require('path');

function run(sql, params=[]) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve(this);
  }));
}
function get(sql, params=[]) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  }));
}
function all(sql, params=[]) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  }));
}

exports.getPosts = async (req, res) => {
  try {
    const posts = await all(`SELECT p.id, p.user_id, p.content, p.image, p.created_at, u.name as user_name
      FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`);

    // gather likes/dislikes and user reaction
    const userId = req.session && req.session.user ? req.session.user.id : null;
    const result = await Promise.all(posts.map(async post => {
      const counts = await get(`SELECT
        SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as likes,
        SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as dislikes
        FROM likes WHERE post_id = ?`, [post.id]);
      const userLikeRow = userId ? await get(`SELECT value FROM likes WHERE post_id = ? AND user_id = ?`, [post.id, userId]) : null;
      return {
        ...post,
        likes: counts && counts.likes ? counts.likes : 0,
        dislikes: counts && counts.dislikes ? counts.dislikes : 0,
        user_reaction: userLikeRow ? userLikeRow.value : 0
      };
    }));

    res.json({ ok: true, posts: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener posts' });
  }
};

exports.createPost = async (req, res) => {
  try {
    console.log('[social] createPost called, session user:', req.session && req.session.user ? req.session.user.email : null);
    if (!req.session || !req.session.user) return res.status(401).json({ ok: false, error: 'No autorizado' });
    const userId = req.session.user.id;
    const content = (req.body.content || '').trim();
    const image = req.file ? `/uploads/posts/${req.file.filename}` : null;

    if (!content && !image) return res.status(400).json({ ok: false, error: 'El post debe contener texto o imagen' });

    const info = await run(`INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)`, [userId, content, image]);
    const postId = info.lastID;
    const post = await get(`SELECT p.id, p.user_id, p.content, p.image, p.created_at, u.name as user_name FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [postId]);

    // emit new post via socket
    const io = req.app.get('io');
    if (io) io.emit('new_post', { post });

    res.json({ ok: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al crear post' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    console.log('[social] toggleLike called, session user:', req.session && req.session.user ? req.session.user.email : null, 'params:', req.params.id, 'body:', req.body);
    if (!req.session || !req.session.user) return res.status(401).json({ ok: false, error: 'No autorizado' });
    const userId = req.session.user.id;
    const postId = parseInt(req.params.id, 10);
    const { value } = req.body; // expect 1 or -1
    if (![1, -1].includes(value)) return res.status(400).json({ ok: false, error: 'Valor inválido' });

    const existing = await get(`SELECT id, value FROM likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
    if (!existing) {
      await run(`INSERT INTO likes (post_id, user_id, value) VALUES (?, ?, ?)`, [postId, userId, value]);
    } else if (existing.value === value) {
      await run(`DELETE FROM likes WHERE id = ?`, [existing.id]);
    } else {
      await run(`UPDATE likes SET value = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`, [value, existing.id]);
    }

    const counts = await get(`SELECT
      SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as likes,
      SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as dislikes
      FROM likes WHERE post_id = ?`, [postId]);

    const io = req.app.get('io');
    const payload = { post_id: postId, likes: counts.likes || 0, dislikes: counts.dislikes || 0 };
    console.log('[social] like result', payload);
    if (io) {
      try {
        io.emit('post_like', payload);
        console.log('[social] post_like emitted');
      } catch(e) {
        console.error('[social] error emitting post_like', e);
      }
    }

    console.log('[social] sending response', payload);
    res.json({ ok: true, likes: counts.likes || 0, dislikes: counts.dislikes || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al procesar like' });
  }
};

exports.deletePost = async (req, res) => {
  try {
    if (!req.session || !req.session.user) return res.status(401).json({ ok: false, error: 'No autorizado' });
    const userId = req.session.user.id;
    const postId = parseInt(req.params.id, 10);
    const post = await get(`SELECT id, user_id, image FROM posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ ok: false, error: 'Publicación no encontrada' });
    if (post.user_id !== userId) return res.status(403).json({ ok: false, error: 'No autorizado' });

    // Borra imagen del sistema de archivos si existe
    if (post.image) {
      try {
        const fs = require('fs');
        const imgPath = path.join(__dirname, '..', 'public', post.image.replace(/^\//, ''));
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      } catch (e) {
        console.warn('[social] error removing image', e);
      }
    }

    await run(`DELETE FROM likes WHERE post_id = ?`, [postId]);
    await run(`DELETE FROM posts WHERE id = ?`, [postId]);

    const io = req.app.get('io');
    if (io) io.emit('post_deleted', { post_id: postId });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al eliminar publicación' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const rows = await all(`SELECT cm.id, cm.user_id, cm.content, cm.created_at, u.name as user_name
      FROM chat_messages cm JOIN users u ON cm.user_id = u.id ORDER BY cm.created_at DESC LIMIT 50`);
    // return in chronological order
    res.json({ ok: true, messages: rows.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al obtener mensajes' });
  }
};

exports.postMessage = async (req, res) => {
  try {
    if (!req.session || !req.session.user) return res.status(401).json({ ok: false, error: 'No autorizado' });
    const userId = req.session.user.id;
    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ ok: false, error: 'Mensaje vacío' });

    const info = await run(`INSERT INTO chat_messages (user_id, content) VALUES (?, ?)`, [userId, content]);
    const messageId = info.lastID;
    const message = await get(`SELECT cm.id, cm.user_id, cm.content, cm.created_at, u.name as user_name
      FROM chat_messages cm JOIN users u ON cm.user_id = u.id WHERE cm.id = ?`, [messageId]);

    const io = req.app.get('io');
    if (io) io.emit('chat_message', message);

    res.json({ ok: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error al publicar mensaje' });
  }
};
