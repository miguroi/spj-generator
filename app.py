from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from docx import Document
from docx.shared import Inches
from dotenv import load_dotenv
from docxcompose.composer import Composer
import os
import io
import boto3
from botocore.exceptions import ClientError
from PIL import Image

load_dotenv()

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not S3_BUCKET_NAME:
    raise ValueError("Missing one or more required environment variables")

app = Flask(__name__, static_folder='static', static_url_path='')

app.config['UPLOAD_FOLDER'] = 'uploads'
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

# S3 configuration
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image(file_content):
    try:
        Image.open(io.BytesIO(file_content))
        return True
    except IOError:
        return False

def is_word(file_content):
    try:
        Document(io.BytesIO(file_content))
        return True
    except:
        return False

def process_files(files, template_name, date):
    merged_doc = Document()
    composer = Composer(merged_doc)
    
    for file in files:
        file_content = file.read()
        file.seek(0)  # Reset file pointer
        if is_image(file_content):
            pil_image = Image.open(file)
            img_stream = io.BytesIO()
            pil_image.save(img_stream, format=pil_image.format)
            img_stream.seek(0)
            merged_doc.add_picture(img_stream, width=Inches(2), height=Inches(2))
        elif is_word(file_content):
            doc = Document(file)
            composer.append(doc)
    
    output_filename = f'SPJ_{template_name}_{date}.docx'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
    composer.save(output_path)
    
    # Upload to S3
    with open(output_path, 'rb') as file:
        s3_client.upload_fileobj(file, S3_BUCKET_NAME, output_filename)
    
    # Remove local file
    os.remove(output_path)
    
    return output_filename

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_spj():
    template_name = request.form.get('templateName')
    date = request.form.get('tanggalAcara')
    files = request.files.getlist('files')
    
    if not template_name or not date or not files:
        return jsonify({'error': 'Missing required data'}), 400
    
    valid_files = [f for f in files if f and allowed_file(f.filename)]
    
    if not valid_files:
        return jsonify({'error': 'No valid files to process'}), 400
    
    try:
        merged_filename = process_files(valid_files, template_name, date)
        return jsonify({'success': True, 'file': merged_filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_obj = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=filename)
        return send_file(
            io.BytesIO(file_obj['Body'].read()),
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except ClientError as e:
        return str(e), 404

if __name__ == '__main__':
    app.run(debug=True)