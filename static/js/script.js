let components = [];
let sortable;
let invoiceItems = [];

document.addEventListener('DOMContentLoaded', function() {
    const toggleInvoiceBtn = document.getElementById('toggle-invoice-details');
    const toggleNotulensiBtn = document.getElementById('toggle-notulensi-details');
    const invoiceDetails = document.getElementById('invoice-details');
    const notulensiDetails = document.getElementById('notulensi-details');

    function toggleForms(event) {
        const clickedBtn = event.target;
        const otherBtn = clickedBtn === toggleInvoiceBtn ? toggleNotulensiBtn : toggleInvoiceBtn;
        const clickedDetails = clickedBtn === toggleInvoiceBtn ? invoiceDetails : notulensiDetails;
        const otherDetails = clickedBtn === toggleInvoiceBtn ? notulensiDetails : invoiceDetails;

        if (clickedDetails.style.display === 'none' || clickedDetails.style.display === '') {
            clickedDetails.style.display = 'block';
            otherDetails.style.display = 'none';
            clickedBtn.classList.add('active');
            otherBtn.classList.remove('active');
        } else {
            clickedDetails.style.display = 'none';
            clickedBtn.classList.remove('active');
        }
    }

    if (toggleInvoiceBtn && toggleNotulensiBtn) {
        toggleInvoiceBtn.addEventListener('click', toggleForms);
        toggleNotulensiBtn.addEventListener('click', toggleForms);
    } else {
        console.error('Toggle buttons not found');
    }

    invoiceDetails.style.display = 'none';
    notulensiDetails.style.display = 'none';

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
            <span>${component.name}</span>
            <select onchange="handleTypeChange(event, ${index})">
                <option value="Foto" ${component.type === 'Foto' ? 'selected' : ''}>Foto</option>
                <option value="Dokumen" ${component.type === 'Dokumen' ? 'selected' : ''}>Dokumen</option>
                <option value="PDF" ${component.type === 'PDF' ? 'selected' : ''}>PDF</option>
            </select>
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

function handleTypeChange(event, index) {
    const newType = event.target.value;
    components[index].type = newType;
    components[index].file = null; // Reset file when type changes
    console.log(`Type changed for component ${index}: ${newType}`);
    updateComponentsList();
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

function addInvoiceItem() {
    const invoiceItemsContainer = document.getElementById('invoice-items');
    const newItem = document.createElement('div');
    newItem.className = 'invoice-item';
    newItem.innerHTML = `
        <input type="text" class="item-type" placeholder="Jenis Item">
        <input type="text" class="item-quantity" placeholder="Jumlah (e.g. 25 Orang)">
        <input type="text" class="item-price" placeholder="Harga">
        <input type="text" class="item-total" placeholder="Total">
        <button class="remove-item" title="Remove Item">&times;</button>
    `;
    invoiceItemsContainer.appendChild(newItem);

    newItem.querySelector('.remove-item').addEventListener('click', function() {
        invoiceItemsContainer.removeChild(newItem);
    });
}

function getInvoiceData() {
    const invoiceItems = Array.from(document.querySelectorAll('.invoice-item')).map((item, index) => ({
        order: index + 1,
        type: item.querySelector('.item-type').value,
        quant: item.querySelector('.item-quantity').value,
        price: item.querySelector('.item-price').value,
        total: item.querySelector('.item-total').value
    }));

    return {
        nomor: document.getElementById('invoice-number').value,
        pengirim: document.getElementById('invoice-sender').value,
        jumlah: document.getElementById('invoice-amount').value,
        terbilang: document.getElementById('invoice-amount-words').value,
        uraian: document.getElementById('invoice-description').value,
        item: invoiceItems,
        iotal: document.getElementById('invoice-total').value,
        tempatTanggal: `Tegalgondo, ${document.getElementById('date').value}`,
        penerima: {
            nama: document.getElementById('invoice-recipient-name').value,
            alamat: document.getElementById('invoice-recipient-address').value,
            noHP: document.getElementById('invoice-recipient-phone').value
        }
    };
}

function generateKuitansi() {
    const invoiceData = getInvoiceData();
    console.log('Generating Kuitansi with data:', invoiceData);
    
    fetch('/generate_invoice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Kuitansi generated successfully. Filename:', data.filename);
            components.push({
                name: 'Generated Kuitansi',
                type: 'Dokumen',
                file: new File([new Blob()], data.filename, {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
            });
            console.log('Updated components list:', components);
            updateComponentsList();
        } else {
            console.error('Error generating Kuitansi:', data.error);
            alert('Error generating Kuitansi: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while generating the Kuitansi. Please try again.');
    });
}

function toggleNotulensiDetails() {
    const notulensiDetails = document.getElementById('notulensi-details');
    const toggleBtn = document.getElementById('toggle-notulensi-details');
    if (notulensiDetails.style.display === 'none') {
        notulensiDetails.style.display = 'block';
        // toggleBtn.textContent = 'Sembunyikan Detail Notulensi';
    } else {
        notulensiDetails.style.display = 'none';
        // toggleBtn.textContent = 'Tampilkan Detail Notulensi';
    }
}

function addPeserta() {
    const pesertaList = document.getElementById('notulensi-peserta-list');
    const newItem = document.createElement('div');
    newItem.className = 'peserta-item';
    newItem.innerHTML = `
        <input type="text" class="peserta-name" placeholder="Nama Peserta">
        <button class="remove-peserta" title="Remove Peserta">&times;</button>
    `;
    pesertaList.appendChild(newItem);

    newItem.querySelector('.remove-peserta').addEventListener('click', function() {
        pesertaList.removeChild(newItem);
    });
}

function getNotulensiData() {
    const pesertaList = Array.from(document.querySelectorAll('.peserta-item')).map(item => ({
        peserta: item.querySelector('.peserta-name').value
    }));

    return {
        namaNotulen: document.getElementById('notulensi-nama').value,
        hari: document.getElementById('notulensi-hari').value,
        tanggal: document.getElementById('notulensi-tanggal').value,
        tempat: document.getElementById('notulensi-tempat').value,
        item: pesertaList,
        hasilNotulen: document.getElementById('notulensi-hasil').value,
        PPS: {
            nama: document.getElementById('notulensi-pps').value,
            namaSekretaris: document.getElementById('notulensi-sekretaris').value,
            NIPSekretaris: document.getElementById('notulensi-nip').value
        }
    };
}

function generateNotulensi() {
    const notulensiData = getNotulensiData();
    console.log('Generating Notulensi with data:', notulensiData);
    
    fetch('/generate_notulensi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(notulensiData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Notulensi generated successfully. Filename:', data.filename);
            components.push({
                name: 'Generated Notulensi',
                type: 'Dokumen',
                file: new File([new Blob()], data.filename, {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
            });
            updateComponentsList();
        } else {
            console.error('Error generating Notulensi:', data.error);
            alert('Error generating Notulensi: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while generating the Notulensi. Please try again.');
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('toggle-notulensi-details').addEventListener('click', toggleNotulensiDetails);
    document.getElementById('generate-notulensi-btn').addEventListener('click', generateNotulensi);
    document.getElementById('add-peserta-btn').addEventListener('click', addPeserta);
});

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
    formData.append('invoiceData', JSON.stringify(getInvoiceData()));

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

function toggleForms(event) {
    const clickedBtn = event.target;
    const invoiceDetails = document.getElementById('invoice-details');
    const notulensiDetails = document.getElementById('notulensi-details');
    const invoiceBtn = document.getElementById('toggle-invoice-details');
    const notulensiBtn = document.getElementById('toggle-notulensi-details');

    if (clickedBtn.id === 'toggle-invoice-details') {
        invoiceDetails.style.display = invoiceDetails.style.display === 'none' ? 'block' : 'none';
        notulensiDetails.style.display = 'none';
        clickedBtn.classList.toggle('active');
        notulensiBtn.classList.remove('active');
    } else {
        notulensiDetails.style.display = notulensiDetails.style.display === 'none' ? 'block' : 'none';
        invoiceDetails.style.display = 'none';
        clickedBtn.classList.toggle('active');
        invoiceBtn.classList.remove('active');
    }

    console.log('Toggle button clicked:', clickedBtn.id);
    console.log('Invoice details display:', invoiceDetails.style.display);
    console.log('Notulensi details display:', notulensiDetails.style.display);
}

document.addEventListener('DOMContentLoaded', function() {
    const toggleInvoiceBtn = document.getElementById('toggle-invoice-details');
    const toggleNotulensiBtn = document.getElementById('toggle-notulensi-details');

    if (toggleInvoiceBtn && toggleNotulensiBtn) {
        toggleInvoiceBtn.addEventListener('click', toggleForms);
        toggleNotulensiBtn.addEventListener('click', toggleForms);
    } else {
        console.error('Toggle buttons not found');
    }
});