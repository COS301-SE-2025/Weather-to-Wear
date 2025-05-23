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
            console.log('Requesting camera access...');
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera access granted');

            // Create camera dialog
            const dialog = document.createElement('div');
            dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            dialog.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow-lg max-w-xl w-full mx-4">
                    <video id="cameraFeed" class="w-full h-64 object-cover mb-4" autoplay playsinline></video>
                    <div class="flex justify-between">
                        <button id="captureBtn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                            Capture Photo
                        </button>
                        <button id="cancelBtn" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                            Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);
            const cameraFeed = dialog.querySelector('#cameraFeed');
            
            // Set up video stream
            cameraFeed.srcObject = stream;
            await cameraFeed.play().catch(console.error);

            // Handle capture button
            dialog.querySelector('#captureBtn').addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                canvas.width = cameraFeed.videoWidth;
                canvas.height = cameraFeed.videoHeight;
                canvas.getContext('2d').drawImage(cameraFeed, 0, 0);
                
                canvas.toBlob((blob) => {
                    currentImageBlob = blob;
                    imagePreview.src = URL.createObjectURL(blob);
                    previewContainer.classList.remove('hidden');
                    resultContainer.classList.add('hidden');
                }, 'image/jpeg');

                // Clean up
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(dialog);
            });

            // Handle cancel button
            dialog.querySelector('#cancelBtn').addEventListener('click', () => {
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(dialog);
            });

            // Error handling
            cameraFeed.onerror = (err) => {
                console.error('Camera feed error:', err);
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(dialog);
            };

        } catch (err) {
            console.error('Camera access error:', err);
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
