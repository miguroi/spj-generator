let components = [];
let sortable;

function updateComponentsList() {
    const list = document.getElementById('components-list');
    list.innerHTML = '';
    components.forEach((component, index) => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.setAttribute('data-id', index);
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
        list.appendChild(div);

        if (component.file) {
            const fileInput = div.querySelector('input[type="file"]');
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(component.file);
            fileInput.files = dataTransfer.files;
        }
    });

    if (sortable) {
        sortable.destroy();
    }
    
    sortable = new Sortable(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;
            if (oldIndex !== newIndex) {
                const movedComponent = components.splice(oldIndex, 1)[0];
                components.splice(newIndex, 0, movedComponent);
            }
        },
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

function addComponent() {
    const name = document.getElementById('new-component-name').value;
    const type = document.getElementById('new-component-type').value;
    
    if (name) {
        components.push({ name, type, file: null });
        updateComponentsList();
        document.getElementById('new-component-name').value = '';
    } else {
        alert('Component name cannot be empty!');
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

document.getElementById('add-component-btn').addEventListener('click', addComponent);
document.getElementById('generate-spj-btn').addEventListener('click', generateSPJ);

updateComponentsList();