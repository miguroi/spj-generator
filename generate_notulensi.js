const fs = require('fs');
const carbone = require('carbone');
const path = require('path');

console.log('Starting notulensi generation');

function generateNotulensi(data, callback) {
    console.log('Received data:', JSON.stringify(data, null, 2));
  
    const notulensiDir = path.join(__dirname, 'notulensi');
    if (!fs.existsSync(notulensiDir)) {
      console.log('Creating notulensi directory');
      fs.mkdirSync(notulensiDir, { recursive: true });
    }
  
    const templatePath = path.join(__dirname, 'NOtulensi_FINAL.docx');
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
      const outputPath = path.join(notulensiDir, `notulensi_${Date.now()}.docx`);
      fs.writeFile(outputPath, result, (err) => {
        if (err) {
          console.error('Error writing file:', err);
          return callback(err);
        }
        console.log('Notulensi generated successfully');
        console.log('OUTPUT_PATH:' + outputPath);
        callback(null, outputPath);
      });
    });
  }
  
  const jsonData = process.argv[2];
  
  try {
    const data = JSON.parse(jsonData);
    generateNotulensi(data, (err, outputPath) => {
      if (err) {
        console.error('Error generating notulensisi:', err);
        process.exit(1);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('Error parsing JSON:', error);
    process.exit(1);
  }