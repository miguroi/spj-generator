const fs = require('fs');
const carbone = require('carbone');
const { exec } = require('child_process');

function generateInvoice(data, callback) {
  carbone.render('./KUITANSI_FINAL.docx', data, function(err, result) {
    if (err) {
      return callback(err);
    }
    const outputPath = `./invoices/invoice_${Date.now()}.docx`;
    fs.writeFile(outputPath, result, (err) => {
      if (err) {
        return callback(err);
      }
      callback(null, outputPath);
    });
  });
}

// Listen for arguments from Python
const args = process.argv.slice(2);
const jsonData = args[0];

try {
  const data = JSON.parse(jsonData);
  generateInvoice(data, (err, outputPath) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(outputPath);
    process.exit(0);
  });
} catch (error) {
  console.error('Error parsing JSON:', error);
  process.exit(1);
}