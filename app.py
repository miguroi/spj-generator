import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import logging
import json
import base64
import subprocess
from docx import Document
from docx.shared import Inches
import boto3
from botocore.exceptions import ClientError
import io

app = Flask(__name__, static_url_path='/static', static_folder='static')

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# AWS S3 configuration
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

components = []

@app.route('/add-component', methods=['POST'])
def add_component():
    new_component = request.json
    logger.debug(f"Adding new component: {new_component}")
    
    # Check if a component with the same name and type already exists
    existing_component = next((c for c in components if c['name'] == new_component['name'] and c['type'] == new_component['type']), None)
    
    if existing_component:
        logger.warning(f"Component already exists: {new_component['name']} ({new_component['type']})")
        return jsonify({'success': False, 'error': 'Component already exists'}), 400
    
    if 'file' in new_component and new_component['file']:
        try:
            file_data = base64.b64decode(new_component['file'].split(',')[1])
            filename = secure_filename(new_component['fileName'])
            
            # Upload file to S3
            s3_client.upload_fileobj(
                io.BytesIO(file_data),
                S3_BUCKET_NAME,
                filename,
                ExtraArgs={'ContentType': 'application/octet-stream'}
            )
            
            new_component['file'] = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{filename}"
            logger.info(f"File uploaded to S3: {new_component['file']}")
        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            return jsonify({'success': False, 'error': 'Error uploading file'}), 500
    
    components.append(new_component)
    logger.info(f"Component added successfully: {new_component['name']} ({new_component['type']})")
    return jsonify({'success': True})

# Update other functions to work with S3 URLs instead of local file paths
# For example, in generate_spj:

@app.route('/generate-spj', methods=['POST'])
def generate_spj():
    template_name = request.form.get('templateName')
    date = request.form.get('tanggalAcara')
    
    if not template_name or not date:
        return jsonify({'error': 'Missing required data'}), 400
    
    try:
        doc = Document()
        doc.add_heading(f'SPJ: {template_name}', 0)
        doc.add_paragraph(f'Tanggal Acara: {date}')
        
        for component in components:
            doc.add_heading(component['name'], level=2)
            if component['type'] == 'Kuitansi':
                doc.add_paragraph(f"Kuitansi: {component['name']}")
            elif component['type'] in ['Foto', 'PDF', 'Dokumen']:
                if component['file']:
                    # Download file from S3
                    file_name = component['file'].split('/')[-1]
                    s3_client.download_file(S3_BUCKET_NAME, file_name, file_name)
                    doc.add_picture(file_name, width=Inches(6))
                    os.remove(file_name)  # Remove the temporary file
                else:
                    doc.add_paragraph(f"File not found for: {component['name']}")
        
        output_filename = f'SPJ_{template_name}_{date}.docx'
        doc.save(output_filename)
        
        # Upload the generated SPJ to S3
        with open(output_filename, 'rb') as spj_file:
            s3_client.upload_fileobj(spj_file, S3_BUCKET_NAME, output_filename)
        
        os.remove(output_filename)  # Remove the local copy
        
        return jsonify({'success': True, 'file': output_filename})
    except Exception as e:
        logger.error(f"Error generating SPJ: {str(e)}")
        return jsonify({'error': 'An error occurred while generating the SPJ'}), 500

# Update download routes to work with S3

@app.route('/download-spj/<filename>')
def download_spj(filename):
    try:
        file_obj = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=filename)
        return send_file(
            io.BytesIO(file_obj['Body'].read()),
            as_attachment=True,
            attachment_filename=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except ClientError as e:
        logger.error(f"Error downloading file from S3: {str(e)}")
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)