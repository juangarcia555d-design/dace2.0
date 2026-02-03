var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const inscripcionesCtrl = require('../controllers/inscripcionesController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'inscripciones'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* GET home page. */
router.get('/', function(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect('/login');
  res.render('index', { title: 'Express' });
});


router.get('/inscripciones', inscripcionesCtrl.showForm);
router.post('/inscripciones', upload.array('documentos', 5), inscripcionesCtrl.submit);
router.get('/inscripciones/success/:id', inscripcionesCtrl.showSuccess);

router.get('/videos', function(req, res, next) {
  res.render('videos', { title: 'Videos de la UNERG' });
});

router.get('/index', function(req, res, next) {
  res.render('index', { title: 'pargina principal' });
});

router.get('/social', function(req, res, next) {
  res.render('social', { title: 'Redes sociales de la UNERG' });
});

// Certificado de inscripción
const certificateCtrl = require('../controllers/certificateController');
router.get('/certificate', function(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect('/login');
  certificateCtrl.showCertificate(req, res);
});
router.get('/certificate/download', function(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect('/login');
  certificateCtrl.downloadCertificate(req, res);
});


module.exports = router;
