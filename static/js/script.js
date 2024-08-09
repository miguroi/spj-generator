let components = [];

function updateComponentsList() {
    const list = document.getElementById('components-list');
    list.innerHTML = '';
    components.forEach((component, index) => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.draggable = true;
        div.setAttribute('data-index', index);
        
        let html = `
            <span>${component.name} (${component.type})</span>
            <input type="file" accept="${getAcceptAttribute(component.type)}" onchange="handleFileUpload(event, ${index})">
            <span class="file-name">${component.file ? component.file.name : 'No file selected'}</span>
        `;
        
        if (component.type === 'Foto') {
            html += `
                <input type="text" placeholder="Image Caption" value="${component.caption || ''}" onchange="handleCaptionChange(event, ${index})">
            `;
        }
        
        html += `
            <button onclick="removeComponent(${index})">Hapus</button>
        `;
        
        div.innerHTML = html;
        
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);

        list.appendChild(div);

        if (component.file) {
            const fileInput = div.querySelector('input[type="file"]');
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(component.file);
            fileInput.files = dataTransfer.files;
        }
    });
}

function handleCaptionChange(event, index) {
    components[index].caption = event.target.value;
}

function getAcceptAttribute(type) {
    switch (type) {
        case 'Foto':
            return '.png,.jpg,.jpeg,.gif';
        case 'Dokumen':
            return '.doc,.docx';
        case 'PDF':
            return '.pdf';
        default:
            return '.png,.jpg,.jpeg,.gif,.doc,.docx,.pdf';
    }
}

function addComponent(type) {
    const name = prompt(`Enter name for the ${type} component:`);
    if (name) {
        components.push({ name, type, file: null });
        updateComponentsList();
    }
}

function removeComponent(index) {
    components.splice(index, 1);
    updateComponentsList();
}

function handleFileUpload(event, index) {
    const file = event.target.files[0];
    if (file) {
        components[index].file = file;
        updateComponentsList();
    }
}

let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (dragSrcEl != this) {
        const srcIndex = parseInt(dragSrcEl.getAttribute('data-index'));
        const destIndex = parseInt(this.getAttribute('data-index'));
        const temp = components[srcIndex];
        components[srcIndex] = components[destIndex];
        components[destIndex] = temp;
        updateComponentsList();
    }
    
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
}

function generateSPJ() {
    const templateName = document.getElementById('template-name').value;
    const tanggalAcara = document.getElementById('date').value;

    if (!templateName) {
        alert('Please enter template name!');
        return;
    }
    if (!tanggalAcara) {
        alert('Please enter event date!');
        return;
    }
    if (components.length === 0) {
        alert('Please add at least one component!');
        return;
    }

    const formData = new FormData();
    formData.append('templateName', templateName);
    formData.append('tanggalAcara', tanggalAcara);

    components.forEach((component, index) => {
        if (component.file) {
            formData.append('files', component.file);
            formData.append(`file_types`, component.type);
            if (component.caption) {
                formData.append(`captions`, component.caption);
            }
        }
    });

    fetch('/generate', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = `/download/${data.file}`;
        } else {
            alert(`Error: ${data.error}`);
        }
    })
    .catch(error => console.error('Error:', error));
}

function generateKuitansi() {
    const kuitansiData = {
        nomor: document.getElementById('kuitansi-nomor').value,
        pengirim: document.getElementById('kuitansi-pengirim').value,
        jumlah: document.getElementById('kuitansi-jumlah').value,
        terbilang: document.getElementById('kuitansi-terbilang').value,
        uraian: document.getElementById('kuitansi-uraian').value,
        // Add more fields as necessary
    };

    fetch('/generate-kuitansi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(kuitansiData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = `/download/${data.file}`;
        } else {
            alert(`Error: ${data.error}`);
        }
    })
    .catch(error => console.error('Error:', error));
}

document.getElementById('generate-spj-btn').addEventListener('click', generateSPJ);

updateComponentsList();