from flask import Flask, request, send_file
from docx import Document
from docx.shared import Inches
from docxcompose.composer import Composer
from PIL import Image
import io
import os

app = Flask(__name__)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/generate', methods=['POST'])
def generate_spj():
    template_name = request.form['templateName']
    date = request.form['tanggalAcara']
    
    merged_doc = Document()
    composer = Composer(merged_doc)
    
    for key, file in request.files.items():
        if file:
            file_data = file.read()
            file_io = io.BytesIO(file_data)
            
            try:
                # Try to open as image
                img = Image.open(file_io)
                merged_doc.add_picture(file_io, width=Inches(6))
            except:
                # If not an image, try as a Word document
                try:
                    doc = Document(file_io)
                    composer.append(doc)
                except:
                    # If neither image nor Word document, skip
                    continue
    
    output = io.BytesIO()
    composer.save(output)
    output.seek(0)
    
    return send_file(
        output,
        as_attachment=True,
        download_name=f'SPJ_{template_name}_{date}.docx',
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

if __name__ == '__main__':
    app.run(debug=True)