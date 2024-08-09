import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import logging
import json
import base64
import subprocess
from docx import Document
from docx.shared import Inches

app = Flask(__name__, static_url_path='/static', static_folder='static')

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

components = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add-component', methods=['POST'])
def add_component():
    new_component = request.json
    logger.debug(f"Adding new component: {new_component}")
    
    if 'file' in new_component and new_component['file']:
        file_data = base64.b64decode(new_component['file'].split(',')[1])
        filename = secure_filename(new_component['fileName'])
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(file_data)
        new_component['file'] = filepath
    
    components.append(new_component)
    return jsonify({'success': True})

@app.route('/get-components', methods=['GET'])
def get_components():
    logger.debug(f"Getting components: {components}")
    return jsonify(components)

@app.route('/reorder-components', methods=['POST'])
def reorder_components():
    data = request.json
    src_index = data['srcIndex']
    dest_index = data['destIndex']
    
    global components
    component = components.pop(src_index)
    components.insert(dest_index, component)
    
    return jsonify({'success': True})

@app.route('/generate-kuitansi', methods=['POST'])
def generate_kuitansi():
    data = request.json
    logger.debug("Received kuitansi data:", data)
    
    script_path = os.path.join('carbone_service', 'generate_kuitansi.js')
    process = subprocess.Popen(['node', script_path], 
                               stdin=subprocess.PIPE, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE)
    stdout, stderr = process.communicate(input=json.dumps(data).encode())
    
    if process.returncode != 0:
        logger.error(f"Error generating kuitansi: {stderr.decode()}")
        return jsonify({'success': False, 'error': 'Failed to generate kuitansi'})
    
    result = json.loads(stdout.decode())
    if 'error' in result:
        return jsonify({'success': False, 'error': result['error']})
    
    file_path = result['file']
    file_name = os.path.basename(file_path)
    
    new_component = {
        'name': f'Kuitansi {data["nomor"]}',
        'type': 'Kuitansi',
        'file': file_path
    }
    components.append(new_component)
    
    return jsonify({'success': True, 'file': file_name})

@app.route('/download-kuitansi/<filename>')
def download_kuitansi(filename):
    directory = os.path.abspath(os.path.dirname(__file__))
    return send_file(os.path.join(directory, filename), as_attachment=True)

@app.route('/generate-spj', methods=['POST'])
def generate_spj():
    template_name = request.form.get('templateName')
    date = request.form.get('tanggalAcara')
    
    if not template_name or not date:
        return jsonify({'error': 'Missing required data'}), 400
    
    doc = Document()
    doc.add_heading(f'SPJ: {template_name}', 0)
    doc.add_paragraph(f'Tanggal Acara: {date}')
    
    for component in components:
        doc.add_heading(component['name'], level=2)
        if component['type'] == 'Kuitansi':
            doc.add_paragraph(f"Kuitansi: {component['name']}")
        elif component['type'] in ['Foto', 'PDF', 'Dokumen']:
            if os.path.exists(component['file']):
                doc.add_picture(component['file'], width=Inches(6))
            else:
                doc.add_paragraph(f"File not found: {component['file']}")
    
    output_filename = f'SPJ_{template_name}_{date}.docx'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
    doc.save(output_path)
    
    return jsonify({'success': True, 'file': output_filename})

@app.route('/download-spj/<filename>')
def download_spj(filename):
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename), as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)