const fs = require('fs');
const carbone = require('carbone');
const path = require('path');

console.log('Starting invoice generation');

function generateInvoice(data, callback) {
  console.log('Received data:', data);

  // Ensure the invoices directory exists
  const invoicesDir = path.join(__dirname, 'invoices');
  if (!fs.existsSync(invoicesDir)) {
    console.log('Creating invoices directory');
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const templatePath = path.join(__dirname, 'KUITANSI_FINAL.docx');
  console.log('Template path:', templatePath);

  if (!fs.existsSync(templatePath)) {
    console.error('Template file does not exist!');
    return callback(new Error('Template file not found'));
  }

  console.log('Rendering with Carbone');
  carbone.render(templatePath, data, function(err, result) {
    if (err) {
      console.error('Carbone render error:', err);
      return callback(err);
    }

    console.log('Carbone render complete, writing file');
    const outputPath = path.join(invoicesDir, `invoice_${Date.now()}.docx`);
    fs.writeFile(outputPath, result, (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return callback(err);
      }
      console.log('Invoice generated successfully at:', outputPath);
      callback(null, outputPath);
    });
  });
}

// Listen for arguments from Python
const args = process.argv.slice(2);
const jsonData = args[0];

console.log('Parsing JSON data');
try {
  const data = JSON.parse(jsonData);
  generateInvoice(data, (err, outputPath) => {
    if (err) {
      console.error('Error generating invoice:', err);
      process.exit(1);
    }
    console.log(outputPath);
    process.exit(0);
  });
} catch (error) {
  console.error('Error parsing JSON:', error);
  process.exit(1);
}