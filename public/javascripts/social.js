(function(){
  const socket = (typeof io === 'function') ? io() : null;
  const postsContainer = document.getElementById('posts');
  const postsLoading = document.getElementById('posts-loading');
  const createForm = document.getElementById('create-post-form');
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const currentUser = window.CURRENT_USER;

  // Helpers
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

  async function fetchPosts() {
    try {
      const res = await fetch('/api/posts', { credentials: 'same-origin' });
      if (res.status === 401) return postsLoading.innerText = 'Inicia sesión para ver publicaciones';
      const data = await res.json();
      if (!data.ok) throw new Error('Error cargando posts');
      renderPosts(data.posts);
    } catch (err) {
      postsLoading.innerText = 'Error cargando publicaciones';
      console.error(err);
    }
  }

  function renderPosts(posts) {
    postsContainer.innerHTML = '';
    if (!posts.length) {
      postsContainer.appendChild(el('div','empty','No hay publicaciones aún'));
      return;
    }
    posts.forEach(p => postsContainer.appendChild(renderPost(p)));
  }

  function renderPost(p) {
    const article = el('article','post-card');
    article.dataset.postId = p.id;
    const header = el('div','post-header');
    const author = el('div','post-author');
    author.innerHTML = `<div class="post-avatar">${(p.user_name||'?').charAt(0)}</div><div><strong>${escapeHtml(p.user_name)}</strong><div class="post-meta">${new Date(p.created_at).toLocaleString()}</div></div>`;
    header.appendChild(author);
    article.appendChild(header);

    const content = el('div','post-content');
    if (p.content) content.appendChild(el('p',null,escapeHtml(p.content)));
    if (p.image) content.appendChild(el('div','post-image',`<img src="${p.image}" alt="imagen" style="max-width:100%;height:auto;border-radius:6px;">`));
    article.appendChild(content);

    const footer = el('div','post-footer');
    const stats = el('div','post-stats');
    stats.innerHTML = `<span class="likes-count"><i class="fas fa-heart"></i> ${p.likes}</span> <span class="dislikes-count"><i class="fas fa-thumbs-down"></i> ${p.dislikes}</span>`;
    footer.appendChild(stats);

    const actions = el('div','post-actions');
    const likeBtn = el('button','action-btn',`<i class="fa${p.user_reaction===1?'s':'r'} fa-heart"></i> <span class="label">Me gusta</span>`);
    const dislikeBtn = el('button','action-btn',`<i class="fa${p.user_reaction===-1?'s':'r'} fa-thumbs-down"></i> <span class="label">No me gusta</span>`);
    likeBtn.addEventListener('click', () => doReaction(p.id, 1, likeBtn, dislikeBtn, article));
    dislikeBtn.addEventListener('click', () => doReaction(p.id, -1, likeBtn, dislikeBtn, article));
    actions.appendChild(likeBtn);
    actions.appendChild(dislikeBtn);

    // delete button (only for post owner)
    try {
      if (window.CURRENT_USER && window.CURRENT_USER.id === p.user_id) {
        const delBtn = el('button','action-btn delete-btn',`<i class="fas fa-trash"></i> <span class="label">Eliminar</span>`);
        delBtn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar publicación?')) return;
          try {
            const res = await fetch(`/api/posts/${p.id}`, { method: 'DELETE', credentials: 'same-origin' });
            if (res.status === 401) return alert('No autorizado');
            if (!res.ok) {
              const txt = await res.text().catch(()=>null);
              console.error('[social] delete failed', res.status, txt);
              return alert('Error eliminando publicación');
            }
            // remove from dom
            const elCard = article;
            if (elCard && elCard.parentNode) elCard.parentNode.removeChild(elCard);
          } catch (err) {
            console.error(err); alert('Error eliminando publicación');
          }
        });
        actions.appendChild(delBtn);
      }
    } catch (e) { console.warn('[social] error adding delete button', e); }

    footer.appendChild(actions);

    article.appendChild(footer);
    return article;
  }

  async function ensureCurrentUser() {
    if (window.CURRENT_USER) return window.CURRENT_USER;
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json().catch(()=>null);
      if (data && data.user) {
        window.CURRENT_USER = data.user;
        // don't reload; just return the user so UI functions can react immediately
        return data.user;
      }
      return null;
    } catch (err) {
      console.error('[social] error checking session', err);
      return null;
    }
  }

  async function doReaction(postId, value, likeBtn, dislikeBtn, article) {
    // If we don't have currentUser, try to validate with the server
    if (!window.CURRENT_USER) {
      const u = await ensureCurrentUser();
      if (!u) return alert('Debes iniciar sesión para reaccionar');
      // ensureCurrentUser reloads the page when it finds a user, so code below will not execute in that case
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ value }) });
      if (res.status === 401) return alert('Debes iniciar sesión para reaccionar');
      if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        console.error('[social] reaction failed', res.status, txt);
        return alert('Error procesando reacción: ' + (txt || res.status));
      }
      let data;
      try {
        data = await res.json();
      } catch (e) {
        const txt = await res.text().catch(()=>null);
        console.error('[social] invalid json from like', txt, e);
        return alert('Error procesando reacción: respuesta inválida del servidor');
      }
      if (!data.ok) return alert('Error procesando reacción: ' + (data.error || '')); 
      // update counts
      article.querySelector('.likes-count').innerHTML = `<i class=\"fas fa-heart\"></i> ${data.likes}`;
      article.querySelector('.dislikes-count').innerHTML = `<i class=\"fas fa-thumbs-down\"></i> ${data.dislikes}`;
      console.log('[social] reaction success', { post_id: postId, value, data });
      // small feedback
      try { const badge = likeBtn.closest('.post-footer').querySelector('.likes-count'); if (badge) { badge.style.transition = 'transform .12s'; badge.style.transform = 'scale(1.05)'; setTimeout(()=> badge.style.transform = '', 120); } } catch(e){}
      // update button icons
      if (value === 1) {
        const isActive = likeBtn.querySelector('i').classList.contains('fas');
        likeBtn.querySelector('i').classList.toggle('fas', !isActive); likeBtn.querySelector('i').classList.toggle('far', isActive);
        // reset dislike
        dislikeBtn.querySelector('i').classList.remove('fas'); dislikeBtn.querySelector('i').classList.add('far');
      } else {
        const isActive = dislikeBtn.querySelector('i').classList.contains('fas');
        dislikeBtn.querySelector('i').classList.toggle('fas', !isActive); dislikeBtn.querySelector('i').classList.toggle('far', isActive);
        likeBtn.querySelector('i').classList.remove('fas'); likeBtn.querySelector('i').classList.add('far');
      }
    } catch (err) {
      console.error(err); alert('Error procesando reacción');
    }
  }

  // posting
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.CURRENT_USER) {
        const u = await ensureCurrentUser();
        if (!u) return alert('Debes iniciar sesión para publicar');
        // ensureCurrentUser reloads when it finds a session, so code below will stop
      }

      const fd = new FormData(createForm);
      try {
        const res = await fetch('/api/posts', { method: 'POST', credentials: 'same-origin', body: fd });
        if (res.status === 401) return alert('Debes iniciar sesión para publicar');
        if (!res.ok) {
          const txt = await res.text().catch(()=>null);
          console.error('[social] create post failed', res.status, txt);
          return alert('Error creando publicación: ' + (txt || res.status));
        }
        let data;
        try { data = await res.json(); } catch (e) { const txt = await res.text().catch(()=>null); console.error('[social] invalid json from create', txt, e); return alert('Error creando publicación: respuesta inválida del servidor'); }
        if (!data.ok) return alert('Error creando publicación: ' + (data.error || ''));
        // prepend new post (avoid duplicates if socket also delivers it)
        if (!postsContainer.querySelector(`.post-card[data-post-id="${data.post.id}"]`)) {
          const newPostEl = renderPost(data.post);
          postsContainer.insertBefore(newPostEl, postsContainer.firstChild);
        }
        hidePostForm(); createForm.reset();
      } catch (err) {
        console.error(err); alert('Error creando publicación: ' + (err.message || ''));
      }
    });
  }

  // chat
  async function fetchMessages() {
    try {
      const res = await fetch('/api/chat/messages', { credentials: 'same-origin' });
      if (res.status === 401) return chatMessages.innerHTML = '<li class="info">Inicia sesión para ver el chat</li>';
      const data = await res.json();
      if (!data.ok) throw new Error('Error cargando chat');
      chatMessages.innerHTML = '';
      data.messages.forEach(m => appendChatMessage(m));
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
      chatMessages.innerHTML = '<li class="error">Error cargando chat</li>';
      console.error(err);
    }
  }

  function appendChatMessage(m) {
    const li = el('li','chat-item',`<strong>${escapeHtml(m.user_name)}</strong>: ${escapeHtml(m.content)} <div class="msg-meta">${new Date(m.created_at).toLocaleTimeString()}</div>`);
    chatMessages.appendChild(li);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = chatInput.value.trim();
      if (!content) return;
      try {
        const res = await fetch('/api/chat/messages', { method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/json'}, body: JSON.stringify({content}) });
        if (res.status === 401) return alert('Debes iniciar sesión para enviar mensajes');
        if (!res.ok) { const txt = await res.text().catch(()=>null); console.error('[social] post message failed', res.status, txt); return alert('Error enviando mensaje: ' + (txt || res.status)); }
        let data;
        try { data = await res.json(); } catch (e) { const txt = await res.text().catch(()=>null); console.error('[social] invalid json from message', txt, e); return alert('Error enviando mensaje: respuesta inválida del servidor'); }
        if (!data.ok) return alert('Error enviando mensaje: ' + (data.error || ''));
        chatInput.value = '';
        // message will be received via socket, but append if no socket
        if (!socket) appendChatMessage(data.message);
      } catch (err) {
        console.error(err); alert('Error enviando mensaje');
      }
    });
  }

  if (socket) {
    socket.on('chat_message', (m) => appendChatMessage(m));
    socket.on('new_post', (payload) => {
      if (!postsContainer.querySelector(`.post-card[data-post-id="${payload.post.id}"]`)) {
        const elPost = renderPost(payload.post);
        postsContainer.insertBefore(elPost, postsContainer.firstChild);
      }
    });
    socket.on('post_like', (data) => {
      const card = document.querySelector(`.post-card[data-post-id="${data.post_id}"]`);
      if (card) {
        const likesEl = card.querySelector('.likes-count');
        const dislikesEl = card.querySelector('.dislikes-count');
        if (likesEl) likesEl.innerHTML = `<i class=\"fas fa-heart\"></i> ${data.likes}`;
        if (dislikesEl) dislikesEl.innerHTML = `<i class=\"fas fa-thumbs-down\"></i> ${data.dislikes}`;
      }
    });
    socket.on('post_deleted', (data) => {
      const card = document.querySelector(`.post-card[data-post-id="${data.post_id}"]`);
      if (card) card.remove();
    });
  }

  // initial load
  fetchPosts();
  fetchMessages();

  // small utilities
  function escapeHtml(str){ if (!str) return ''; return String(str).replace(/[&<>"']/g, function(s){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]; }); }

  // Expose modal controls and show functions globally (buttons use inline onclick)
  window.hidePostForm = function(){
    const el = document.getElementById('post-form'); if (el) el.style.display = 'none';
  };

  window.showPostForm = async function(){
    if (window.CURRENT_USER) {
      const el = document.getElementById('post-form'); if (el) el.style.display = 'block';
      return;
    }
    const u = await ensureCurrentUser();
    if (u) {
      const el = document.getElementById('post-form'); if (el) el.style.display = 'block';
      return;
    }
    alert('Debes iniciar sesión para crear una publicación');
    window.location.href = '/login';
  };

  window.showEventForm = function(){
    // try to show the post form (will check auth)
    window.showPostForm().then(() => {
      const sel = document.querySelector('#post-form select'); if (sel) sel.value = 'evento';
    });
  };

})();