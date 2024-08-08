import streamlit as st
from docx import Document
from docx.shared import Inches
import os
from docxcompose.composer import Composer
from PIL import Image
import io

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image(file):
    try:
        Image.open(file)
        return True
    except IOError:
        return False

def is_word(file):
    try:
        Document(file)
        return True
    except:
        return False

def process_files(files, template_name, date):
    merged_doc = Document()
    composer = Composer(merged_doc)
    
    for file in files:
        if is_image(file):
            merged_doc.add_picture(file, width=Inches(2), height=Inches(2))
        elif is_word(file):
            doc = Document(file)
            composer.append(doc)
    
    output_path = os.path.join(UPLOAD_FOLDER, f'SPJ_{template_name}_{date}.docx')
    composer.save(output_path)
    return f'SPJ_{template_name}_{date}.docx'

st.title('Document Merger')

date = st.date_input('Event Date')
template_name = st.text_input('Template Name')

uploaded_files = st.file_uploader("Choose files", accept_multiple_files=True, type=list(ALLOWED_EXTENSIONS))

if st.button('Generate SPJ'):
    if not uploaded_files:
        st.error('No files uploaded')
    elif not date or not template_name:
        st.error('Please fill in all fields')
    else:
        with st.spinner('Processing...'):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            valid_files = [file for file in uploaded_files if allowed_file(file.name)]
            
            if valid_files:
                merged_filename = process_files(valid_files, template_name, date.strftime('%Y-%m-%d'))
                st.success('SPJ generated successfully!')
                
                with open(os.path.join(UPLOAD_FOLDER, merged_filename), 'rb') as file:
                    st.download_button(
                        label="Download SPJ",
                        data=file,
                        file_name=merged_filename,
                        mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    )
            else:
                st.error('No valid files to process')

st.sidebar.title('About')
st.sidebar.info('This app merges multiple documents and images into a single Word document.')