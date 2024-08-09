const carbone = require('carbone');
const fs = require('fs');

const generateKuitansi = (data, callback) => {
  const templatePath = '../KUITANSI_FINAL.docx';  // Adjust this path as needed
  
  carbone.render(templatePath, data, (err, result) => {
    if (err) {
      console.error(err);
      return callback(err);
    }
    
    const outputPath = `../temp_kuitansi_${data.nomor}.docx`;
    fs.writeFile(outputPath, result, (err) => {
      if (err) {
        console.error(err);
        return callback(err);
      }
      callback(null, outputPath);
    });
  });
};

process.on('message', (data) => {
  generateKuitansi(data, (err, outputPath) => {
    if (err) {
      process.send({ error: err.message });
    } else {
      process.send({ success: true, file: outputPath });
    }
  });
});