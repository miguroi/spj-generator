let components = [];

function updateComponentsList() {
    fetch('/get-components')
        .then(response => response.json())
        .then(data => {
            components = data;
            const list = document.getElementById('components-list');
            list.innerHTML = '';
            components.forEach((component, index) => {
                const div = document.createElement('div');
                div.className = 'component-item';
                div.draggable = true;
                div.setAttribute('data-index', index);
                
                let html = `
                    <span>${component.name} (${component.type})</span>
                `;
                
                if (component.type !== 'Kuitansi') {
                    html += `
                        <input type="file" accept="${getAcceptAttribute(component.type)}" onchange="handleFileUpload(event, ${index})">
                        <span class="file-name">${component.file ? 'File selected' : 'No file selected'}</span>
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
            });
        })
        .catch(error => console.error('Error:', error));
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

console.log("script.js loaded");

function addComponent(type) {
    console.log(`Adding ${type} component`);
    const name = prompt(`Enter name for the ${type} component:`);
    if (name) {
        const component = { name, type, file: null };
        
        fetch('/add-component', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(component)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateComponentsList();
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function removeComponent(index) {
    components.splice(index, 1);
    updateComponentsList();
}

function handleFileUpload(event, index) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const component = components[index];
            component.file = e.target.result;
            component.fileName = file.name;
            
            fetch('/add-component', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(component)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateComponentsList();
                } else {
                    alert(`Error: ${data.error}`);
                }
            })
            .catch(error => console.error('Error:', error));
        };
        reader.readAsDataURL(file);
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
        
        fetch('/reorder-components', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ srcIndex, destIndex })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateComponentsList();
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => console.error('Error:', error));
    }
    
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
}

function generateKuitansi() {
    console.log('Generating kuitansi...');
    const kuitansiData = {
        nomor: document.getElementById('kuitansi-nomor').value,
        pengirim: document.getElementById('kuitansi-pengirim').value,
        jumlah: document.getElementById('kuitansi-jumlah').value,
        terbilang: document.getElementById('kuitansi-terbilang').value,
        uraian: document.getElementById('kuitansi-uraian').value,
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
            alert('Kuitansi has been generated and added as a component');
            // Trigger download
            window.location.href = `/download-kuitansi/${data.file}`;
            updateComponentsList();
        } else {
            alert(`Error: ${data.error}`);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Add event listeners after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Adding event listeners");
    
    document.getElementById('generate-kuitansi-btn').addEventListener('click', generateKuitansi);
    
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => addComponent(btn.textContent.trim()));
    });
    
    updateComponentsList();
});