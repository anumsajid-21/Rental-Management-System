import PDFDocument from 'pdfkit';

/**
 * Generate a professional branded PDF Rent Receipt in PKR.
 * @param {Object} data - Receipt transaction details
 * @returns {Promise<Buffer>} - Resolves to PDF Buffer
 */
export function generateRentReceiptPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const {
        receiptNumber = `REC-${Date.now().toString().slice(-6)}`,
        tenantName = 'Valued Tenant',
        ownerName = 'Property Management',
        propertyName = 'Rehainsh Property',
        unitNumber = '—',
        rentMonth = '—',
        amount = 0,
        paymentDate = new Date().toISOString().slice(0, 10),
        status = 'PAID',
        reference = 'N/A',
      } = data;

      // Header Brand
      doc
        .rect(50, 45, 495, 65)
        .fill('#2b4c3f');

      doc
        .fillColor('#ffffff')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('REHAINSH RENTALS', 70, 58);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Official Rent Payment Receipt | Pakistan', 70, 84);

      // Receipt Metadata Box
      doc.fillColor('#1e293b');
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`RECEIPT #: ${receiptNumber}`, 50, 130);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Issued Date: ${paymentDate}`, 50, 148)
        .text(`Payment Status: `, 50, 164);

      doc
        .font('Helvetica-Bold')
        .fillColor(status.toUpperCase() === 'PAID' ? '#15803d' : '#b45309')
        .text(status.toUpperCase(), 135, 164);

      // Dividing rule
      doc
        .moveTo(50, 185)
        .lineTo(545, 185)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();

      // Parties Details
      doc.fillColor('#1e293b');
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Tenant Information:', 50, 200);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${tenantName}`, 50, 218)
        .text(`Property: ${propertyName}`, 50, 234)
        .text(`Unit Number: ${unitNumber}`, 50, 250);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Landlord / Payee:', 320, 200);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Name: ${ownerName}`, 320, 218)
        .text(`System: Rehainsh Rental Management`, 320, 234)
        .text(`Currency: PKR (Pakistani Rupee)`, 320, 250);

      // Breakdown Table Header
      const tableTop = 290;
      doc
        .rect(50, tableTop, 495, 24)
        .fill('#f1f5f9');

      doc
        .fillColor('#334155')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', 65, tableTop + 7)
        .text('PERIOD / MONTH', 280, tableTop + 7)
        .text('AMOUNT (PKR)', 430, tableTop + 7);

      // Table Row
      const rowY = tableTop + 35;
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .text(`Residential Unit Rental (${unitNumber})`, 65, rowY)
        .text(rentMonth, 280, rowY)
        .font('Helvetica-Bold')
        .text(`PKR ${Number(amount).toLocaleString('en-PK')}`, 430, rowY);

      // Total Box
      const totalY = rowY + 35;
      doc
        .rect(300, totalY, 245, 30)
        .fill('#f8fafc');

      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TOTAL PAID (PKR):', 315, totalY + 9)
        .fillColor('#15803d')
        .text(`PKR ${Number(amount).toLocaleString('en-PK')}`, 430, totalY + 9);

      // Payment Details
      doc.fillColor('#64748b').fontSize(9).font('Helvetica');
      doc.text(`Reference / Transaction ID: ${reference}`, 50, totalY + 60);
      doc.text('Payment Channel: Direct Portal / Bank Settlement (PKR)', 50, totalY + 75);

      // Verification Footnote
      const footerY = 680;
      doc
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .fillColor('#64748b')
        .fontSize(8)
        .text(
          'This is an official computer-generated receipt from Rehainsh Rental Management System. Valid without manual signature.',
          50,
          footerY + 12,
          { align: 'center', width: 495 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
