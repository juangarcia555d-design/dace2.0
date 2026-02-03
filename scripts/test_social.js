const db = require('../db');
const { createUser } = require('../models/userModel');
const social = require('../controllers/socialController');

(async () => {
  try {
    // create user
    const user = await createUser('Tester', `tester+${Date.now()}@example.com`, 'hash');
    console.log('created user', user);

    // mock req/res for createPost
    const req = { session: { user }, body: { content: 'Post de prueba desde script' }, file: null, app: { get: () => null } };
    const res = {
      status(code) { this._status = code; return this; },
      json(obj) { console.log('createPost response:', obj); }
    };

    await social.createPost(req, res);

    // get posts
    const getReq = { session: { user } };
    const getRes = { status(code) { this._status = code; return this; }, json(obj) { console.log('getPosts response:', obj); } };
    await social.getPosts(getReq, getRes);

    // toggle like
    const postId = 1; // try id 1
    const likeReq = { session: { user }, params: { id: String(postId) }, body: { value: 1 }, app: { get: () => null } };
    const likeRes = { status(code) { this._status = code; return this; }, json(obj) { console.log('like response:', obj); } };
    await social.toggleLike(likeReq, likeRes);

    // fetch posts again
    await social.getPosts(getReq, getRes);

    process.exit(0);
  } catch (err) {
    console.error('script error', err);
    process.exit(1);
  }
})();