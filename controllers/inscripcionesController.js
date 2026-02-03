const { createInscripcion, findById } = require('../models/inscripcionModel');

exports.showForm = (req, res) => {
  res.render('inscripciones', { title: 'Inscripción de Carreras', errors: [], success: null, horarioImage: null, form: {} });
};

exports.submit = async (req, res) => {
  const { carrera, nombre, cedula, correo, observaciones } = req.body;
  const files = req.files || [];
  const errors = [];

  if (!carrera) errors.push('Seleccione una carrera');
  if (!nombre) errors.push('El nombre es obligatorio');
  if (!cedula) errors.push('La cédula es obligatoria');
  if (!correo) errors.push('El correo es obligatorio');
  if (!files.length) errors.push('Suba al menos un documento');

  if (errors.length) {
    return res.render('inscripciones', { title: 'Inscripción de Carreras', errors, success: null, horarioImage: null, form: { carrera, nombre, cedula, correo, observaciones } });
  }

  try {
    const documentos = files.map(f => `/uploads/inscripciones/${f.filename}`);
    const result = await createInscripcion({ carrera, nombre, cedula, correo, documentos, observaciones });

    // redirect to success page with the created record id
    return res.redirect(`/inscripciones/success/${result.id}`);
  } catch (err) {
    console.error(err);
    errors.push('Error del servidor al guardar la inscripción');
    return res.render('inscripciones', { title: 'Inscripción de Carreras', errors, success: null, horarioImage: null, form: { carrera, nombre, cedula, correo, observaciones } });
  }
};

exports.showSuccess = async (req, res) => {
  const id = req.params.id;
  try {
    const insc = await findById(id);
    if (!insc) return res.status(404).render('error', { message: 'Inscripción no encontrada', error: {} });

    const mapping = {
      medicina: 'medicina.PNG',
      derecho: 'derecho.PNG',
      ingenieria: 'informatica.PNG',
      informatica: 'informatica.PNG',
      odontologia: 'odontologia.PNG',
      civil: 'civil.PNG',
      educacion: 'civil.PNG'
    };

    const horarioImage = mapping[insc.carrera] || 'medicina.PNG';
    const message = 'Felicidades te has inscrito correctamente, bienvenido a nuestro hogar de estudio UNERG.';

    res.render('inscripcion_success', { title: 'Inscripción completada', message, horarioImage, inscripcion: insc });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Error del servidor', error: {} });
  }
};