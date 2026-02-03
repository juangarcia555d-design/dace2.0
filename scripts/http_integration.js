const fetch = global.fetch;
const FormData = global.FormData;

const base = 'http://localhost:3000';

async function run(){
  // register
  const email = `integration+${Date.now()}@example.com`;
  console.log('Registering', email);
  const reg = await fetch(base + '/register', { method: 'POST', body: new URLSearchParams({ name: 'Integration', email, password: '123456', password2: '123456' }), redirect: 'manual' });
  console.log('register status', reg.status, reg.headers.get('set-cookie'));

  // login
  const login = await fetch(base + '/login', { method: 'POST', body: new URLSearchParams({ email, password: '123456' }), redirect: 'manual' });
  console.log('login status', login.status, login.headers.get('set-cookie'));
  const setCookie = login.headers.get('set-cookie') || reg.headers.get('set-cookie');
  if (!setCookie) {
    console.error('No set-cookie received');
  }
  const cookie = setCookie ? setCookie.split(';')[0] : null;
  console.log('cookie header to use:', cookie);

  // check /api/me
  const me = await fetch(base + '/api/me', { headers: { cookie } });
  console.log('/api/me status', me.status);
  console.log('me body', await me.text());

  // create post (multipart)
  const fd = new FormData();
  fd.append('content', 'Integration post ' + Date.now());
  const create = await fetch(base + '/api/posts', { method: 'POST', body: fd, headers: { cookie } });
  console.log('create post status', create.status);
  const createBody = await create.text();
  console.log('create body:', createBody);
  let postId = null;
  try {
    const json = JSON.parse(createBody);
    if (json.ok && json.post) postId = json.post.id;
  } catch (e) {}

  // if created, like it
  if (postId) {
    const like = await fetch(base + `/api/posts/${postId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ value: 1 }) });
    console.log('like status', like.status, 'body:', await like.text());
  }
}

run().catch(err => { console.error(err); process.exit(1); });
