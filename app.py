import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from docx import Document
from docx.shared import Inches
from docxcompose.composer import Composer
from pdf2docx import Converter
import io
import boto3
from botocore.exceptions import ClientError
from PIL import Image
import tempfile

app = Flask(__name__)

AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

if not all([AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME]):
    print("Warning: One or more required environment variables are missing.")

# S3 configuration
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image(file_content):
    try:
        Image.open(io.BytesIO(file_content))
        return True
    except IOError:
        return False

def is_pdf(filename):
    return filename.lower().endswith('.pdf')

def convert_pdf_to_docx(pdf_content):
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_temp:
        pdf_temp.write(pdf_content)
        pdf_temp_path = pdf_temp.name

    docx_temp = tempfile.NamedTemporaryFile(suffix='.docx', delete=False)
    docx_temp_path = docx_temp.name
    docx_temp.close()

    # Convert PDF to DOCX
    cv = Converter(pdf_temp_path)
    cv.convert(docx_temp_path)
    cv.close()

    # Read the converted DOCX
    with open(docx_temp_path, 'rb') as docx_file:
        docx_content = docx_file.read()

    # Clean up temporary files
    os.unlink(pdf_temp_path)
    os.unlink(docx_temp_path)

    return docx_content

def process_files(files, template_name, date):
    merged_doc = Document()
    composer = Composer(merged_doc)
    
    for file in files:
        filename = secure_filename(file.filename)
        file_content = file.read()
        
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            pil_image = Image.open(io.BytesIO(file_content))
            img_stream = io.BytesIO()
            pil_image.save(img_stream, format=pil_image.format)
            img_stream.seek(0)
            merged_doc.add_picture(img_stream, width=Inches(2), height=Inches(2))
        elif filename.lower().endswith('.pdf'):
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_temp:
                pdf_temp.write(file_content)
                pdf_temp_path = pdf_temp.name

            docx_temp = tempfile.NamedTemporaryFile(suffix='.docx', delete=False)
            docx_temp_path = docx_temp.name
            docx_temp.close()

            # Convert PDF to DOCX
            cv = Converter(pdf_temp_path)
            cv.convert(docx_temp_path)
            cv.close()

            # Read the converted DOCX
            with open(docx_temp_path, 'rb') as docx_file:
                doc = Document(docx_file)
                composer.append(doc)

            # Clean up temporary files
            os.unlink(pdf_temp_path)
            os.unlink(docx_temp_path)
        else:
            doc = Document(io.BytesIO(file_content))
            composer.append(doc)
    
    output_filename = f'SPJ_{template_name}_{date}.docx'
    output_stream = io.BytesIO()
    composer.save(output_stream)
    output_stream.seek(0)
    
    # Upload to S3
    s3_client.upload_fileobj(output_stream, S3_BUCKET_NAME, output_filename)
    
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
    app.run(debug=False)