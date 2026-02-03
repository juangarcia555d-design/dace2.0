const PDFDocument = require('pdfkit');

exports.showCertificate = (req, res) => {
  if (!req.session || !req.session.user) return res.redirect('/login');
  const user = req.session.user;
  res.render('certificate', { title: 'Certificado de Inscripción', user });
};

exports.downloadCertificate = (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).send('No autorizado');
  const user = req.session.user;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filename = `certificado_inscripcion_${(user.name||'usuario').replace(/\s+/g,'_')}.pdf`;
  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-type', 'application/pdf');

  // Pipe PDF to response
  doc.pipe(res);

  // Simple certificate layout
  doc.fontSize(20).text('UNERG — Certificado de Inscripción', { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(14).text(`Se certifica que:`, { align: 'left' });
  doc.moveDown(0.5);

  doc.fontSize(18).text(`${user.name}`, { align: 'left', underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12).text(`Correo: ${user.email || 'N/A'}`);
  doc.text(`ID de usuario: ${user.id || 'N/A'}`);
  doc.moveDown(1);

  const today = new Date();
  doc.text(`Fecha de emisión: ${today.toLocaleDateString()} `);
  doc.moveDown(1);

  doc.fontSize(12).text('Por la presente se acredita que la persona arriba mencionada se encuentra inscrita en el sistema académico institucional de la UNERG y cumple los requisitos de inscripción según registro vigente.', { align: 'justify' });

  doc.moveDown(2);
  doc.text('Atentamente,', { align: 'left' });
  doc.moveDown(3);
  doc.text('Dirección de Admisión, Control y Evaluación (DACE)', { align: 'left' });

  doc.end();
};