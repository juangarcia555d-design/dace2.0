var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authRouter = require('./routes/auth');
var apiRouter = require('./routes/api');
var session = require('express-session');

// Try to use connect-sqlite3; if sqlite3 native bindings are missing, fall back to MemoryStore
var SQLiteStore;
try {
  SQLiteStore = require('connect-sqlite3')(session);
} catch (err) {
  console.warn('[app] Warning: connect-sqlite3 failed to load. Falling back to in-memory session store. To enable persistent sessions, install sqlite3 for your platform or use Node 18 and rebuild.');
  SQLiteStore = null;
}

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: SQLiteStore ? new SQLiteStore({ db: 'sessions.sqlite', dir: './', concurrentDB: true }) : new session.MemoryStore(),
  secret: process.env.SESSION_SECRET || 'dacein-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, sameSite: 'lax' } // 7 days
}));

if (!SQLiteStore) console.warn('[app] Session persistence is using MemoryStore (not suitable for production). Install sqlite3 to enable persistent sessions.');

// Make user available in views
app.use(function(req, res, next) {
  res.locals.user = req.session && req.session.user ? req.session.user : null;
  next();
});

app.use('/', authRouter);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
