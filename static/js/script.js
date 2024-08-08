let components = [];

function updateComponentsList() {
    const list = document.getElementById('components-list');
    list.innerHTML = '';
    components.forEach((component, index) => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.innerHTML = `
            <span>${component.name} (${component.type})</span>
            <input type="file" accept="${getAcceptAttribute(component.type)}" onchange="handleFileUpload(event, ${index})">
            <span class="file-name">${component.file ? component.file.name : 'No file selected'}</span>
            <button onclick="removeComponent(${index})">Hapus</button>
            <div class="move-buttons">
                <button onclick="moveComponent(${index}, -1)">↑</button>
                <button onclick="moveComponent(${index}, 1)">↓</button>
            </div>
        `;
        list.appendChild(div);

        // If a file was previously selected, set it to the file input
        if (component.file) {
            const fileInput = div.querySelector('input[type="file"]');
            // Create a new FileList containing this file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(component.file);
            fileInput.files = dataTransfer.files;
        }
    });
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

function moveComponent(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < components.length) {
        [components[index], components[newIndex]] = [components[newIndex], components[index]];
        updateComponentsList();
    }
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