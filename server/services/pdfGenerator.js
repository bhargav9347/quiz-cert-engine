import PDFDocument from 'pdfkit';

export const generateCertificatePDF = (data, res) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                layout: 'landscape',
                size: 'A4',
                margin: 0
            });

            // Error handling for the document
            doc.on('error', (err) => {
                console.error('PDFKit Error:', err);
                reject(err);
            });

            // Pipe to response
            doc.pipe(res);

            // Background Colors / Border
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
            doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(5).stroke('#1c2541');
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(2).stroke('#f4a261');

            // Decorative Shapes
            doc.save();
            doc.translate(doc.page.width - 150, 50);
            doc.rotate(45);
            doc.rect(0, 0, 100, 100).fill('#2ec4b6');
            doc.restore();

            // Content
            doc.fillColor('#0b132b')
                .font('Helvetica-Bold')
                .fontSize(40)
                .text('CERTIFICATE OF ACHIEVEMENT', 0, 100, { align: 'center' });

            doc.fontSize(20)
                .font('Helvetica')
                .text('This is to certify that', 0, 180, { align: 'center' });

            doc.fillColor('#2ec4b6')
                .font('Helvetica-Bold')
                .fontSize(35)
                .text(data.fullName.toUpperCase(), 0, 220, { align: 'center' });

            doc.fillColor('#0b132b')
                .font('Helvetica')
                .fontSize(20)
                .text('has successfully completed the quiz', 0, 280, { align: 'center' });

            doc.font('Helvetica-Bold')
                .fontSize(25)
                .text(`"${data.quizTitle}"`, 0, 320, { align: 'center' });

            doc.font('Helvetica')
                .fontSize(18)
                .text(`with a score of ${data.score}%`, 0, 370, { align: 'center' });

            // Footer / Details
            doc.fontSize(12)
                .text(`Certificate No: ${data.certNumber}`, 100, 480)
                .text(`Issued on: ${new Date(data.date).toLocaleDateString()}`, 100, 500);

            // Signature line
            doc.moveTo(doc.page.width - 300, 490)
                .lineTo(doc.page.width - 100, 490)
                .stroke();
            doc.text('Authorized Signature', doc.page.width - 300, 500, { width: 200, align: 'center' });

            doc.end();

            // Listen for the stream to finish
            res.on('finish', resolve);
            res.on('error', reject);
        } catch (err) {
            reject(err);
        }
    });
};
