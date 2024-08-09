import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import logging
import json
import base64
import subprocess

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
    
    # Call the Node.js script to generate kuitansi
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
    
    # Assuming the Node.js script returns the path to the generated file
    file_path = result['file']
    file_name = os.path.basename(file_path)
    
    # Add the generated kuitansi as a new component
    new_component = {
        'name': f'Kuitansi {data["nomor"]}',
        'type': 'Kuitansi',
        'file': file_path
    }
    components.append(new_component)
    
    return jsonify({'success': True, 'file': file_name})

# Add a new route to download the generated kuitansi
@app.route('/download-kuitansi/<filename>')
def download_kuitansi(filename):
    directory = os.path.abspath(os.path.dirname(__file__))
    return send_file(os.path.join(directory, filename), as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)