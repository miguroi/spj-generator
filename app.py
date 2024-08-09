import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docxcompose.composer import Composer
from pdf2docx import Converter
import io
import boto3
from botocore.exceptions import ClientError
from PIL import Image
import tempfile
import logging

app = Flask(__name__)

# AWS and S3 configuration (unchanged)
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
    print("Warning: One or more required environment variables are missing.")

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'pdf'}

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_pdf_to_docx(pdf_content):
    # (PDF conversion function remains unchanged)
    pass

def process_files(files, nama_acara, tanggal_acara):
    merged_doc = Document()
    composer = Composer(merged_doc)
    
    for file_data in files:
        file = file_data['file']
        file_type = file_data['type']
        file_name = file_data['name']
        
        try:
            file_content = file.read()
            
            if file_type in ['File Gambar', 'Dokumentasi']:
                img = Image.open(io.BytesIO(file_content))
                img_stream = io.BytesIO()
                img.save(img_stream, format=img.format)
                img_stream.seek(0)
                merged_doc.add_picture(img_stream, width=Inches(6))
            elif file_type == 'File PDF':
                docx_content = convert_pdf_to_docx(file_content)
                if docx_content:
                    doc = Document(io.BytesIO(docx_content))
                    composer.append(doc)
            else:  # Assume it's a Word document or other supported file type
                doc = Document(io.BytesIO(file_content))
                composer.append(doc)
            
        except Exception as e:
            logger.error(f"Error processing {file_name}: {str(e)}")
            continue

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_spj():
    nama_acara = request.form.get('namaAcara')
    tanggal_acara = request.form.get('tanggalAcara')
    files = request.files.getlist('files[]')
    file_types = request.form.getlist('fileTypes[]')
    file_names = request.form.getlist('fileNames[]')
    
    if not nama_acara or not tanggal_acara or not files:
        return jsonify({'error': 'Missing required data'}), 400
    
    file_data = [
        {'file': file, 'type': file_type, 'name': file_name}
        for file, file_type, file_name in zip(files, file_types, file_names)
        if file and allowed_file(file.filename)
    ]
    
    if not file_data:
        return jsonify({'error': 'No valid files to process'}), 400
    
    try:
        merged_filename = process_files(file_data, nama_acara, tanggal_acara)
        return jsonify({'success': True, 'file': merged_filename})
    except Exception as e:
        logger.error(f"Error processing files: {str(e)}")
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
    app.run(debug=False)