let components = [];

function updateComponentsList() {
    const list = document.getElementById('components-list');
    list.innerHTML = '';
    components.forEach((component, index) => {
        const div = document.createElement('div');
        div.className = 'component-item';
        div.innerHTML = `
            <span>${component.name} (${component.type})</span>
            <input type="text" value="${component.file || ''}" placeholder="${component.type === 'Foto' ? 'foto.jpg' : 'dokumen.doc'}" readonly>
            <button onclick="uploadFile(${index})">Upload</button>
            <button onclick="removeComponent(${index})">Hapus</button>
            <div class="move-buttons">
                <button onclick="moveComponent(${index}, -1)">↑</button>
                <button onclick="moveComponent(${index}, 1)">↓</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function addComponent() {
    const name = document.getElementById('new-component-name').value;
    const type = document.getElementById('new-component-type').value;
    if (name) {
        components.push({ name, type, file: '' });
        updateComponentsList();
        document.getElementById('new-component-name').value = '';
    }
}

function removeComponent(index) {
    components.splice(index, 1);
    updateComponentsList();
}

function moveComponent(index, direction) {
    if ((index + direction) >= 0 && (index + direction) < components.length) {
        const temp = components[index];
        components[index] = components[index + direction];
        components[index + direction] = temp;
        updateComponentsList();
    }
}

function uploadFile(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                components[index].file = data.filename;
                updateComponentsList();
            } else {
                alert('Upload failed: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during upload');
        });
    };
    input.click();
}

function generateSPJ() {
    const templateName = document.getElementById('template-name').value;
    if (!templateName) {
        alert('Mohon isi nama template!');
        return;
    }
    const tanggalAcara = document.getElementById('date').value;
    if (!tanggalAcara) {
        alert('Mohon isi tanggal acara!');
        return;
    }
    if (components.length === 0) {
        alert('Mohon tambahkan setidaknya satu komponen!');
        return;
    }

    fetch('/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            templateName: templateName,
            components: components,
            tanggalAcara: tanggalAcara
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('SPJ berhasil dibuat!');
            window.location.href = `/download/${data.file}`;
        } else {
            alert('Gagal membuat SPJ: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat membuat SPJ');
    });
}

document.getElementById('add-component-btn').addEventListener('click', addComponent);
document.getElementById('generate-spj-btn').addEventListener('click', generateSPJ);

updateComponentsList();