(function () {
    const audioFileInput = document.getElementById('audioFile');
    const transcribeBtn = document.getElementById('transcribeBtn');
    const transcriptArea = document.getElementById('transcript');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const downloadDocxBtn = document.getElementById('downloadDocxBtn');
    const copyBtn = document.getElementById('copyBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const reloadBtn = document.getElementById('reloadBtn');
    const status = document.getElementById('status');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    const editNameModal = document.getElementById('editNameModal');
    const editNameInput = document.getElementById('editNameInput');
    const editNameConfirmBtn = document.getElementById('editNameConfirmBtn');
    const editNameCancelBtn = document.getElementById('editNameCancelBtn');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
    const deleteCancelBtn = document.getElementById('deleteCancelBtn');
    const transcriptionList = document.getElementById('transcriptionList');
    const transcriptHeader = document.getElementById('transcriptHeader');
    const rightHeaderButtons = document.getElementById('rightHeaderButtons');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('overlay');

    let transcript = '';
    let currentTranscriptionId = null;
    let currentTranscriptionName = '';
    let currentEditId = null;

    async function fetchUser() {
        try {
            const response = await fetch('/api/user');
            const data = await response.json();
            welcomeMessage.textContent = `Bienvenid@, ${data.nombre}`;
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    }

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    });

    function removeSaveButton() {
        const existingSaveBtn = rightHeaderButtons.querySelector('.save-btn');
        if (existingSaveBtn) {
            existingSaveBtn.remove();
        }
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (file) {
            const validExtensions = ['.mp3', '.mp4', '.wav', '.ogg', '.m4a', '.flac'];
            const fileExtension = file.name.toLowerCase().split('.').pop();
            if (!validExtensions.includes(`.${fileExtension}`)) {
                showAlert('Solo se aceptan archivos MP3, MP4, WAV, OGG, M4A o FLAC.');
                transcribeBtn.disabled = true;
                return;
            }
            if (file.size > 700 * 1024 * 1024) {
                showAlert('Archivo demasiado grande (máximo 700 MB).');
                transcribeBtn.disabled = true;
                return;
            }
            transcribeBtn.disabled = false;
            updateStatus('Archivo cargado. Presiona "Transcribir Audio".', 'text-green-400');
        } else {
            transcribeBtn.disabled = true;
            updateStatus('Por favor, selecciona un archivo de audio.', 'text-yellow-400');
        }
    }

    async function handleTranscribe() {
        const file = audioFileInput.files[0];
        if (!file) {
            showAlert('No se seleccionó ningún archivo.');
            return;
        }

        resetTranscript();
        updateStatus('Enviando archivo al servidor...', 'text-emerald-400');
        showLoading(true);

        const formData = new FormData();
        formData.append('audio', file);
        formData.append('filename', file.name);

        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error en la transcripción');
            }

            const data = await response.json();
            transcript = data.transcript || '';
            currentTranscriptionId = data.id_transcripcion;
            currentTranscriptionName = file.name;

            transcriptArea.value = transcript;
            updateTranscriptHeader(currentTranscriptionName);

            if (transcript.trim()) {
                copyBtn.disabled = false;
                downloadTxtBtn.disabled = false;
                downloadDocxBtn.disabled = false;
                showAlert('¡Transcripción completada!');
                updateStatus(`¡Transcripción completada!`, 'text-green-400');
                fetchTranscriptionHistory();
            } else {
                updateStatus('No se pudo generar transcripción.', 'text-red-400');
            }
        } catch (error) {
            showAlert(`Error: ${error.message}`);
            updateStatus('Error al transcribir.', 'text-red-400');
        } finally {
            showLoading(false);
        }
    }

    async function fetchTranscriptionHistory() {
        try {
            const response = await fetch('/api/transcriptions');
            const transcriptions = await response.json();
            transcriptionList.innerHTML = '';

            transcriptions.forEach(transcription => {
                const displayName = transcription.nombre_archivo ||
                    (transcription.filename || 'Transcripción sin nombre');

                const li = document.createElement('li');
                li.className = 'transcription-item';
                li.innerHTML = `
                            <span class="transcription-name flex-1 min-w-0 pr-2 truncate" 
                                  data-id="${transcription.id_transcripcion}" 
                                  data-name="${displayName}">${displayName}</span>
                            <div class="ellipsis-menu">
                                <div class="ellipsis-btn">
                                    <div class="dot"></div>
                                    <div class="dot"></div>
                                    <div class="dot"></div>
                                </div>
                            </div>
                        `;
                transcriptionList.appendChild(li);
            });

            document.querySelectorAll('.transcription-name').forEach(item => {
                item.addEventListener('click', (e) => {
                    const id = item.dataset.id;
                    const name = item.dataset.name || item.textContent.trim();
                    currentTranscriptionId = id;
                    currentTranscriptionName = name;
                    fetchTranscription(id, name);
                });
            });

            document.querySelectorAll('.ellipsis-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeAllMenus();

                    const id = btn.parentElement.previousElementSibling.dataset.id;
                    const name = btn.parentElement.previousElementSibling.dataset.name;
                    const menu = createEllipsisMenu(id, name);
                    document.body.appendChild(menu);

                    const rect = btn.getBoundingClientRect();
                    const sidebarRect = sidebar.getBoundingClientRect();
                    const isMobile = window.innerWidth < 768;
                    const menuWidth = 140;
                    const viewportWidth = window.innerWidth;

                    if (isMobile) {
                        let left = rect.left + window.scrollX + (rect.width / 2) - (menuWidth / 2);
                        if (left < 10) left = 10;
                        else if (left + menuWidth > viewportWidth - 10) {
                            left = viewportWidth - menuWidth - 10;
                        }
                        menu.style.left = `${left}px`;
                        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
                    } else {
                        menu.style.left = `${sidebarRect.right + 10}px`;
                        menu.style.top = `${rect.top + window.scrollY}px`;
                    }

                    menu.classList.add('active');

                    menu.querySelector('.edit-name').addEventListener('click', (e) => {
                        e.preventDefault();
                        currentEditId = id;
                        editNameInput.value = '';
                        editNameModal.style.display = 'flex';
                        editNameInput.focus();
                        closeAllMenus();
                    });

                    menu.querySelector('.edit-transcription').addEventListener('click', (e) => {
                        e.preventDefault();

                        // REMOVER CUALQUIER BOTÓN SAVE ANTERIOR
                        removeSaveButton();

                        // HABILITAR EDICIÓN
                        transcriptArea.removeAttribute('readonly');
                        updateStatus('Editando transcripción. Presiona "Guardar" para guardar cambios.', 'text-yellow-400');

                        // CREAR UN SOLO BOTÓN SAVE
                        const saveBtn = document.createElement('button');
                        saveBtn.type = 'button';
                        saveBtn.className = 'btn bg-emerald-500 text-white py-1 px-3 rounded-md font-semibold ml-2 save-btn';
                        saveBtn.textContent = 'Guardar';
                        saveBtn.onclick = () => handleSaveTranscription(id, saveBtn);
                        rightHeaderButtons.appendChild(saveBtn);

                        closeAllMenus();
                    });

                    menu.querySelector('.delete-transcription').addEventListener('click', (e) => {
                        e.preventDefault();
                        currentEditId = id;
                        deleteConfirmModal.style.display = 'flex';
                        closeAllMenus();
                    });
                });
            });
        } catch (error) {
            console.error('Error fetching transcriptions:', error);
            showAlert('Error al cargar el historial.');
        }
    }

    function createEllipsisMenu(id, name) {
        const menu = document.createElement('div');
        menu.className = 'ellipsis-menu-content';
        menu.innerHTML = `
                    <a href="#" class="edit-name" data-id="${id}">Editar nombre</a>
                    <a href="#" class="edit-transcription" data-id="${id}">Editar transcripción</a>
                    <a href="#" class="delete-transcription" data-id="${id}">Borrar</a>
                `;
        return menu;
    }

    function closeAllMenus() {
        document.querySelectorAll('.ellipsis-menu-content').forEach(menu => menu.remove());
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.ellipsis-menu')) closeAllMenus();
    });

    async function fetchTranscription(id, nameFromList = null) {
        updateStatus('Cargando transcripción...', 'text-yellow-400');
        transcriptArea.value = '';
        copyBtn.disabled = true;
        downloadTxtBtn.disabled = true;
        downloadDocxBtn.disabled = true;

        // LIMPIAR BOTÓN SAVE SI EXISTE
        removeSaveButton();

        // RESTAURAR MODO LECTURA
        transcriptArea.setAttribute('readonly', 'true');

        fileNameDisplay.classList.add('hidden');

        try {
            const response = await fetch(`/api/transcriptions/${id}`);
            if (!response.ok) throw new Error('Error al cargar la transcripción');

            const data = await response.json();

            const fileName = nameFromList ||
                (data.nombre_archivo || data.filename || 'Transcripción sin nombre');

            currentTranscriptionName = fileName;
            transcript = data.texto_transcrito || '';

            transcriptArea.value = transcript;
            updateTranscriptHeader(fileName);

            copyBtn.disabled = !transcript.trim();
            downloadTxtBtn.disabled = !transcript.trim();
            downloadDocxBtn.disabled = !transcript.trim();
            currentTranscriptionId = id;

            updateStatus(`Transcripción cargada`, 'text-green-400');
        } catch (error) {
            console.error('Error fetching transcription:', error);
            showAlert('Error al cargar la transcripción.');
            updateStatus('Error al cargar.', 'text-red-400');
        }
    }

    function updateTranscriptHeader(fileName) {
        if (!fileNameDisplay) return;

        const icon = fileNameDisplay.querySelector('svg');
        const textSpan = fileNameDisplay.querySelector('span') || document.createElement('span');

        const displayName = fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName;
        const fullName = fileName;

        textSpan.textContent = displayName;
        fileNameDisplay.dataset.fullname = fullName;

        fileNameDisplay.innerHTML = '';
        fileNameDisplay.appendChild(icon.cloneNode(true));
        fileNameDisplay.appendChild(textSpan);

        fileNameDisplay.classList.remove('hidden');
    }

    async function handleSaveTranscription(id, saveBtn) {
        try {
            saveBtn.textContent = 'Guardando...';
            saveBtn.disabled = true;

            const response = await fetch(`/api/transcriptions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto_transcrito: transcriptArea.value })
            });

            if (response.ok) {
                showAlert('Transcripción guardada correctamente.');
                transcriptArea.setAttribute('readonly', 'true');
                saveBtn.remove();
                transcript = transcriptArea.value;
                updateStatus('Transcripción guardada.', 'text-green-400');
            } else {
                const errorData = await response.json();
                showAlert(`Error al guardar: ${errorData.error || 'Inténtalo de nuevo'}`);
            }
        } catch (error) {
            showAlert('Error al guardar la transcripción.');
            console.error('Error saving transcription:', error);
        } finally {
            if (saveBtn.parentNode) {
                saveBtn.remove();
            }
            transcriptArea.setAttribute('readonly', 'true');
        }
    }

    async function handleUpdateName(id, newName) {
        try {
            const response = await fetch(`/api/transcriptions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_archivo: newName })
            });
            if (response.ok) {
                showAlert('Nombre actualizado correctamente.');
                currentTranscriptionName = newName;
                if (currentTranscriptionId === id) {
                    updateTranscriptHeader(newName);
                }
                fetchTranscriptionHistory();
            } else {
                showAlert('Error al actualizar el nombre.');
            }
        } catch (error) {
            showAlert('Error al actualizar el nombre.');
        }
    }

    async function handleDeleteTranscription(id) {
        try {
            const response = await fetch(`/api/transcriptions/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showAlert('Transcripción borrada correctamente.');
                fetchTranscriptionHistory();
                if (currentTranscriptionId === id) resetTranscript();
            } else {
                showAlert('Error al borrar la transcripción.');
            }
        } catch (error) {
            showAlert('Error al borrar la transcripción.');
        }
    }

    function handleCopy() {
        if (!transcriptArea.value.trim()) {
            showAlert('No hay texto para copiar.');
            return;
        }
        navigator.clipboard.writeText(transcriptArea.value).then(() => {
            showAlert('¡Texto copiado al portapapeles!');
        }).catch(() => {
            showAlert('Error al copiar el texto.');
        });
    }

    function handleDownloadTxt() {
        if (!transcript.trim()) {
            showAlert('No hay transcripción para descargar.');
            return;
        }
        const blob = new Blob([transcript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentTranscriptionName.replace(/[^a-z0-9]/gi, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        updateStatus('Archivo TXT descargado.', 'text-green-400');
    }

    function handleDownloadDocx() {
        if (!transcript.trim()) {
            showAlert('No hay transcripción para descargar.');
            return;
        }
        const doc = new docx.Document({
            sections: [{
                properties: {},
                children: [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: transcript,
                                font: "Arial",
                                size: 24
                            })
                        ],
                        alignment: docx.AlignmentType.JUSTIFIED
                    })
                ]
            }]
        });

        docx.Packer.toBlob(doc).then(blob => {
            saveAs(blob, `${currentTranscriptionName.replace(/[^a-z0-9]/gi, '_')}.docx`);
            updateStatus('Archivo Word descargado.', 'text-green-400');
        }).catch(error => {
            showAlert('Error al generar el archivo Word.');
            console.error(error);
        });
    }

    function handleLogout() {
        fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).then(response => response.json())
            .then(data => {
                showAlert(data.message);
                setTimeout(() => window.location.href = '/login.html', 2000);
            })
            .catch(error => {
                console.error('Error al cerrar sesión:', error);
                showAlert('Error al cerrar sesión.');
            });
    }

    function handleReload() {
        window.location.reload();
    }

    function resetTranscript() {
        transcript = '';
        currentTranscriptionId = null;
        currentTranscriptionName = '';
        transcriptArea.value = '';
        transcriptArea.setAttribute('readonly', 'true');
        copyBtn.disabled = true;
        downloadTxtBtn.disabled = true;
        downloadDocxBtn.disabled = true;

        // LIMPIAR BOTÓN SAVE
        removeSaveButton();

        fileNameDisplay.classList.add('hidden');

        updateStatus('Selecciona una transcripción del historial o sube un nuevo archivo.', 'text-gray-400');
    }

    function updateStatus(message, className = 'text-gray-400') {
        status.textContent = message;
        status.className = `mt-4 text-center text-xs sm:text-sm ${className}`;
    }

    function showLoading(show) {
        loadingSpinner.classList.toggle('hidden', !show);
    }

    function showAlert(message) {
        alertMessage.textContent = message;
        alertModal.style.display = 'flex';
        setTimeout(() => alertModal.style.display = 'none', 4000);
    }

    // Event listeners para modales
    alertModal.addEventListener('click', () => alertModal.style.display = 'none');

    editNameCancelBtn.addEventListener('click', () => {
        editNameModal.style.display = 'none';
        editNameInput.value = '';
        currentEditId = null;
    });

    editNameConfirmBtn.addEventListener('click', () => {
        const newName = editNameInput.value.trim();
        if (newName && currentEditId) {
            handleUpdateName(currentEditId, newName);
            editNameModal.style.display = 'none';
            editNameInput.value = '';
            currentEditId = null;
        } else {
            showAlert('Por favor, ingresa un nombre válido.');
        }
    });

    deleteCancelBtn.addEventListener('click', () => {
        deleteConfirmModal.style.display = 'none';
        currentEditId = null;
    });

    deleteConfirmBtn.addEventListener('click', () => {
        if (currentEditId) {
            handleDeleteTranscription(currentEditId);
            deleteConfirmModal.style.display = 'none';
            currentEditId = null;
        }
    });

    document.querySelectorAll('.custom-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                if (modal === editNameModal) {
                    editNameInput.value = '';
                    currentEditId = null;
                } else if (modal === deleteConfirmModal) {
                    currentEditId = null;
                }
            }
        });
    });

    // Event listeners principales
    audioFileInput.addEventListener('change', handleFileChange);
    transcribeBtn.addEventListener('click', handleTranscribe);
    downloadTxtBtn.addEventListener('click', handleDownloadTxt);
    downloadDocxBtn.addEventListener('click', handleDownloadDocx);
    copyBtn.addEventListener('click', handleCopy);
    logoutBtn.addEventListener('click', handleLogout);
    reloadBtn.addEventListener('click', handleReload);

    fetchUser();
    fetchTranscriptionHistory();
})();