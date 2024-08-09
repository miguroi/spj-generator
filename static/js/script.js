document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('spj-form');
    const componentsList = document.getElementById('components-list');
    const componentButtons = document.querySelectorAll('.component-btn');
    let sortable;

    initializeSortable();

    componentButtons.forEach(button => {
        button.addEventListener('click', function() {
            addComponent(this.dataset.type);
        });
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        generateSPJ();
    });

    function initializeSortable() {
        sortable = new Sortable(componentsList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.drag-handle',
            onEnd: function (evt) {
                console.log('Item moved', evt.oldIndex, evt.newIndex);
            }
        });
    }

    function addComponent(type) {
        const componentDiv = document.createElement('div');
        componentDiv.className = 'component-item';
        componentDiv.innerHTML = `
            <span class="drag-handle">☰</span>
            <input type="text" class="file-name" placeholder="Nama File" required>
            <input type="file" class="file-input" required multiple>
            <input type="hidden" class="file-type" value="${type}">
            <span class="file-type-label">${type}</span>
            <button type="button" class="remove-btn">Hapus</button>
        `;
        componentsList.appendChild(componentDiv);

        componentDiv.querySelector('.remove-btn').addEventListener('click', function() {
            componentDiv.remove();
        });

        componentDiv.querySelector('.file-input').addEventListener('change', function(e) {
            const fileNames = Array.from(e.target.files).map(file => file.name).join(', ');
            componentDiv.querySelector('.file-name').value = fileNames;
        });
    }

    function generateSPJ() {
        const namaAcara = document.getElementById('nama-acara').value;
        const tanggalAcara = document.getElementById('tanggal-acara').value;
        const components = document.querySelectorAll('.component-item');

        if (!namaAcara || !tanggalAcara || components.length === 0) {
            alert('Mohon lengkapi semua data dan tambahkan minimal satu komponen.');
            return;
        }

        const formData = new FormData();
        formData.append('namaAcara', namaAcara);
        formData.append('tanggalAcara', tanggalAcara);

        components.forEach((component, index) => {
            const files = component.querySelector('.file-input').files;
            const fileName = component.querySelector('.file-name').value;
            const fileType = component.querySelector('.file-type').value;

            for (let i = 0; i < files.length; i++) {
                formData.append('files[]', files[i]);
                formData.append('fileNames[]', fileName);
                formData.append('fileTypes[]', fileType);
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
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while generating the SPJ. Please try again.');
        });
    }
});