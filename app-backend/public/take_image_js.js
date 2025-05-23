document.addEventListener('DOMContentLoaded', () => {
    const cameraBtn = document.getElementById('cameraBtn');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const processBtn = document.getElementById('processBtn');
    const resultContainer = document.getElementById('resultContainer');
    const byteOutput = document.getElementById('byteOutput');
    const categorySelect = document.getElementById('categorySelect');

    let currentImageBlob = null;

    cameraBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });

            const dialog = document.createElement('div');
            dialog.className = 'fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50';
            dialog.innerHTML = `
                <div class="bg-white rounded-lg p-4 max-w-md w-full">
                    <div class="relative aspect-video mb-4">
                        <video class="w-full h-full bg-black rounded" id="cameraFeed" autoplay></video>
                    </div>
                    <div class="flex justify-between">
                        <button id="captureBtn" class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg">Capture</button>
                        <button id="cancelBtn" class="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            const cameraFeed = dialog.querySelector('#cameraFeed');
            cameraFeed.srcObject = stream;

            const captureBtn = dialog.querySelector('#captureBtn');
            const cancelBtn = dialog.querySelector('#cancelBtn');

            captureBtn.addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                canvas.width = cameraFeed.videoWidth;
                canvas.height = cameraFeed.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(blob => {
                    currentImageBlob = blob;
                    imagePreview.src = URL.createObjectURL(blob);
                    previewContainer.classList.remove('hidden');
                    resultContainer.classList.add('hidden');

                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(dialog);
                }, 'image/jpeg');
            });

            cancelBtn.addEventListener('click', () => {
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(dialog);
            });
        } catch (err) {
            alert('Error accessing camera: ' + err.message);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            currentImageBlob = file;
            imagePreview.src = URL.createObjectURL(file);
            previewContainer.classList.remove('hidden');
            resultContainer.classList.add('hidden');
        }
    });

    processBtn.addEventListener('click', async () => {
        if (!currentImageBlob) {
            alert('Please take or upload an image first.');
            return;
        }

        const selectedCategory = categorySelect.value;
        if (!selectedCategory) {
            alert('Please select a clothing category.');
            return;
        }

        const formData = new FormData();
        formData.append('image', currentImageBlob, 'clothing.jpg');
        formData.append('category', selectedCategory);

        try {
            const response = await fetch('http://localhost:5000/api/closet/upload-image', {
                method: 'POST',
                body: formData
                // Don't set Content-Type manually for FormData
            });

            if (!response.ok) {
                throw new Error('Upload failed with status ' + response.status);
            }

            const result = await response.json();
            byteOutput.textContent = `Image uploaded successfully! ID: ${result.id}`;
            resultContainer.classList.remove('hidden');
        } catch (err) {
            console.error('Upload error:', err);
            byteOutput.textContent = 'Failed to upload image.';
            resultContainer.classList.remove('hidden');
        }
    });
});
