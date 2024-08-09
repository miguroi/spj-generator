const carbone = require('carbone');
const fs = require('fs');
const path = require('path');

const generateKuitansi = (data, callback) => {
  const templatePath = path.join(__dirname, 'kuitansi_template.docx');
  
  carbone.render(templatePath, data, (err, result) => {
    if (err) {
      return callback(err);
    }
    
    const outputPath = path.join(__dirname, `kuitansi_${data.nomor}.docx`);
    fs.writeFile(outputPath, result, (err) => {
      if (err) {
        return callback(err);
      }
      callback(null, outputPath);
    });
  });
};

// Read data from stdin
let inputData = '';
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  const data = JSON.parse(inputData);
  generateKuitansi(data, (err, outputPath) => {
    if (err) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.log(JSON.stringify({ success: true, file: outputPath }));
    }
  });
});