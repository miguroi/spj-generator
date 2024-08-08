let components = [];

function updateComponentsList() {
    const list = document.getElementById('components-list');
    list.innerHTML = '';
    components.forEach((component, index) => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.innerHTML = `
            <span>${component.name}</span>
            <span>(${component.file.name})</span>
            <button onclick="removeComponent(${index})">Hapus</button>
        `;
        list.appendChild(div);
    });
}

function addComponent() {
    const name = document.getElementById('new-component-name').value;
    const fileInput = document.getElementById('new-component-file');
    
    if (name && fileInput.files.length > 0) {
        components.push({ name, file: fileInput.files[0] });
        updateComponentsList();
        document.getElementById('new-component-name').value = '';
        fileInput.value = '';
    } else {
        alert('Please enter a component name and select a file.');
    }
}

function removeComponent(index) {
    components.splice(index, 1);
    updateComponentsList();
}

function generateSPJ(event) {
    event.preventDefault();
    
    const templateName = document.getElementById('template-name').value;
    const tanggalAcara = document.getElementById('date').value;

    if (!templateName || !tanggalAcara) {
        alert('Please enter template name and event date.');
        return;
    }

    if (components.length === 0) {
        alert('Please add at least one component.');
        return;
    }

    const formData = new FormData();
    formData.append('templateName', templateName);
    formData.append('tanggalAcara', tanggalAcara);

    components.forEach((component, index) => {
        formData.append(`files`, component.file);
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
document.getElementById('spj-form').addEventListener('submit', generateSPJ);

updateComponentsList();