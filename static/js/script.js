let components = [];
let sortable;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    initializeApp();
});

function initializeApp() {
    const addComponentBtn = document.getElementById('add-component-btn');
    const generateSpjBtn = document.getElementById('generate-spj-btn');

    if (addComponentBtn) {
        addComponentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Add component button clicked');
            addComponent();
        });
    } else {
        console.error('Add component button not found');
    }

    if (generateSpjBtn) {
        generateSpjBtn.addEventListener('click', generateSPJ);
    } else {
        console.error('Generate SPJ button not found');
    }

    // Initialize sortable if components list exists
    const componentsList = document.getElementById('components-list');
    if (componentsList) {
        initializeSortable();
    } else {
        console.error('Components list not found');
    }

    updateComponentsList();
}

function initializeSortable() {
    const list = document.getElementById('components-list');
    if (list) {
        sortable = new Sortable(list, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const itemEl = evt.item;
                const newIndex = evt.newIndex;
                const oldIndex = evt.oldIndex;
                console.log(`Item moved from index ${oldIndex} to ${newIndex}`);
                
                // Update the components array
                const movedComponent = components.splice(oldIndex, 1)[0];
                components.splice(newIndex, 0, movedComponent);
            }
        });
    }
}

function updateComponentsList() {
    console.log('Updating components list');
    const list = document.getElementById('components-list');
    if (!list) {
        console.error('Components list element not found');
        return;
    }
    list.innerHTML = '';
    components.forEach((component, index) => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.setAttribute('data-id', index);
        let html = `
            <span class="drag-handle">☰</span>
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

    console.log(`Updated list with ${components.length} components`);
}

function handleCaptionChange(event, index) {
    components[index].caption = event.target.value;
    console.log(`Caption changed for component ${index}: ${event.target.value}`);
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
    console.log('Adding new component');
    const name = document.getElementById('new-component-name').value;
    const type = document.getElementById('new-component-type').value;
    
    console.log(`New component - Name: ${name}, Type: ${type}`);

    if (name) {
        components.push({ name, type, file: null });
        updateComponentsList();
        document.getElementById('new-component-name').value = '';
        console.log(`Component added. Total components: ${components.length}`);
    } else {
        console.warn('Component name is empty');
        alert('Component name cannot be empty!');
    }
}

function removeComponent(index) {
    console.log(`Removing component at index ${index}`);
    components.splice(index, 1);
    updateComponentsList();
}

function handleFileUpload(event, index) {
    const file = event.target.files[0];
    if (file) {
        console.log(`File selected for component ${index}: ${file.name}`);
        components[index].file = file;
        updateComponentsList();
    }
}

function generateSPJ() {
    console.log('Generating SPJ');
    const templateName = document.getElementById('template-name').value;
    const tanggalAcara = document.getElementById('date').value;

    if (!templateName) {
        console.warn('Template name is empty');
        alert('Please enter template name!');
        return;
    }
    if (!tanggalAcara) {
        console.warn('Event date is empty');
        alert('Please enter event date!');
        return;
    }
    if (components.length === 0) {
        console.warn('No components added');
        alert('Please add at least one component!');
        return;
    }

    console.log(`Generating SPJ - Template: ${templateName}, Date: ${tanggalAcara}`);

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
            console.log(`Added component ${index} to form data: ${component.name} (${component.type})`);
        }
    });

    fetch('/generate', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('SPJ generated successfully');
            window.location.href = `/download/${data.file}`;
        } else {
            console.error(`Error generating SPJ: ${data.error}`);
            alert(`Error: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while generating the SPJ. Please try again.');
    });
}