from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
from docx import Document #python-docx
from docx.shared import Inches
import os
import docx
from docxcompose.composer import Composer #docxcompose
from PIL import Image #Pillow
import io

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image(file_path):
    try:
        Image.open(file_path)
        return True
    except IOError:
        return False

def is_word(file_path):
    try:
        Document(file_path)
        return True
    except:
        return False

def process_files(file_paths, template_name, date):
    merged_doc = Document()
    composer = Composer(merged_doc)
    
    for file_path in file_paths:
        if is_image(file_path):
            merged_doc.add_picture(file_path, width=Inches(2), height=Inches(2))
        elif is_word(file_path):
            doc = Document(file_path)
            composer.append(doc)
    
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], f'SPJ_{template_name}_{date}.docx')
    composer.save(output_path)
    return f'SPJ_{template_name}_{date}.docx'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        return jsonify({'success': True, 'filename': filename})
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/generate', methods=['POST'])
def generate_spj():
    data = request.json
    date = data['tanggalAcara']
    template_name = data['templateName']
    components = data['components']
    
    file_paths = []
    for component in components:
        if component['file']:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], component['file'])
            if os.path.exists(file_path):
                file_paths.append(file_path)
    
    if file_paths:
        merged_filename = process_files(file_paths, template_name, date)
        return jsonify({'success': True, 'file': merged_filename})
    else:
        return jsonify({'error': 'No valid files to process'}), 400

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename), as_attachment=True)

if __name__ == '__main__':
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.run(debug=True)