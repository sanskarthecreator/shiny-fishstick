const { jsPDF } = window.jspdf;
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const convertBtn = document.getElementById('convertBtn');
const editModal = document.getElementById('editModal');
const editImage = document.getElementById('editImage');
const rotateLeftBtn = document.getElementById('rotateLeft');
const rotateRightBtn = document.getElementById('rotateRight');
const cropBtn = document.getElementById('crop');
const saveEditBtn = document.getElementById('saveEdit');
const cancelEditBtn = document.getElementById('cancelEdit');
let images = [];
let currentImageIndex = null;
let cropper = null;
let rotation = 0;

// Drag and Drop Events
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('active');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('active');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('active');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// File Input Click
dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
});

// Handle Files
function handleFiles(files) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    for (const file of files) {
        if (validTypes.includes(file.type)) {
            images.push({ file, rotation: 0, croppedData: null });
            displayImage(images.length - 1);
        } else {
            alert(`${file.name} is not a valid image format. Please upload PNG or JPG.`);
        }
    }
    updateConvertButton();
}

// Display Image Preview
function displayImage(index) {
    const imgData = images[index].croppedData || URL.createObjectURL(images[index].file);
    const img = document.createElement('img');
    img.src = imgData;
    img.dataset.index = index;
    img.addEventListener('click', () => openEditModal(index));
    preview.appendChild(img);
}

// Update Convert Button State
function updateConvertButton() {
    convertBtn.disabled = images.length === 0;
}

// Open Edit Modal
function openEditModal(index) {
    currentImageIndex = index;
    rotation = images[index].rotation;
    const imgData = images[index].croppedData || URL.createObjectURL(images[index].file);
    editImage.src = imgData;
    editModal.style.display = 'flex';
    if (cropper) cropper.destroy();
    cropper = new Cropper(editImage, {
        aspectRatio: NaN,
        viewMode: 1,
        autoCrop: false,
        background: false,
        cropBoxResizable: true,
        cropBoxMovable: true,
    });
}

// Rotate Image
rotateLeftBtn.addEventListener('click', () => {
    rotation -= 90;
    cropper.rotate(-90);
});

rotateRightBtn.addEventListener('click', () => {
    rotation += 90;
    cropper.rotate(90);
});

// Crop Image
cropBtn.addEventListener('click', () => {
    if (cropper.getCroppedCanvas()) {
        const croppedData = cropper.getCroppedCanvas().toDataURL('image/jpeg');
        images[currentImageIndex].croppedData = croppedData;
        cropper.destroy();
        cropper = new Cropper(editImage, {
            aspectRatio: NaN,
            viewMode: 1,
            autoCrop: false,
            background: false,
            cropBoxResizable: true,
            cropBoxMovable: true,
        });
    }
});

// Save Edited Image
saveEditBtn.addEventListener('click', () => {
    images[currentImageIndex].rotation = rotation;
    if (cropper.getCroppedCanvas()) {
        images[currentImageIndex].croppedData = cropper.getCroppedCanvas().toDataURL('image/jpeg');
    }
    preview.innerHTML = '';
    images.forEach((_, i) => displayImage(i));
    editModal.style.display = 'none';
    cropper.destroy();
    updateConvertButton();
});

// Cancel Edit
cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
    cropper.destroy();
});

// Convert to PDF
convertBtn.addEventListener('click', async () => {
    if (images.length === 0) return;

    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    const doc = new jsPDF({ orientation });
    let yOffset = 10;

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        let imgData = img.croppedData || await getImageData(img.file);
        const rotation = img.rotation;

        // Handle rotation
        if (rotation !== 0) {
            imgData = await rotateImage(imgData, rotation);
        }

        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (yOffset + pdfHeight > doc.internal.pageSize.getHeight() - 10) {
            doc.addPage();
            yOffset = 10;
        }

        doc.addImage(imgData, 'JPEG', 10, yOffset, pdfWidth, pdfHeight);
        yOffset += pdfHeight + 10;

        if (i < images.length - 1) {
            doc.addPage();
            yOffset = 10;
        }
    }

    doc.save('SnapToPDF_Output.pdf');
});

// Get Image Data as Base64
function getImageData(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Rotate Image
function rotateImage(imgData, degrees) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imgData;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const rad = (degrees * Math.PI) / 180;
            canvas.width = degrees % 180 === 0 ? img.width : img.height;
            canvas.height = degrees % 180 === 0 ? img.height : img.width;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            resolve(canvas.toDataURL('image/jpeg'));
        };
    });
}