(function () {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('overlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const userCountElement = document.getElementById('userCount');
    const transcriptionCountElement = document.getElementById('transcriptionCount');
    const latestTranscriptionElement = document.getElementById('latestTranscription');
    const topUsersCard = document.getElementById('topUsersCard');
    const topUsersModal = document.getElementById('topUsersModal');
    const topUsersModalContent = document.getElementById('topUsersModalContent');
    const topUsersList = document.getElementById('topUsersList');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const userSearch = document.getElementById('userSearch');
    const filterBtn = document.querySelector('.filter-btn');
    const usersTableBody = document.getElementById('usersTableBody');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const transcriptionFilter = document.getElementById('transcriptionFilter');
    const applyTranscriptionFilter = document.getElementById('applyTranscriptionFilter');
    const transcriptionsTableBody = document.getElementById('transcriptionsTableBody');
    const transcriptionLoadingSpinner = document.getElementById('transcriptionLoadingSpinner');
    const transcriptionModal = document.getElementById('transcriptionModal');
    const transcriptionText = document.getElementById('transcriptionText');
    const copyTranscriptionBtn = document.getElementById('copyTranscriptionBtn');
    const closeTranscriptionBtn = document.getElementById('closeTranscriptionBtn');
    const copyMessage = document.getElementById('copyMessage');
    const userModal = document.getElementById('userModal');
    const userIdElement = document.getElementById('userId');
    const userCreatedElement = document.getElementById('userCreated');
    const userNameInput = document.getElementById('userNameInput');
    const userEmailInput = document.getElementById('userEmailInput');
    const userPasswordInput = document.getElementById('userPasswordInput');
    const editUserBtn = document.getElementById('editUserBtn');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const closeUserBtn = document.getElementById('closeUserBtn');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportOptions = document.querySelectorAll('.report-option');

    let allUsers = [];
    let allTranscriptions = [];
    let selectedUser = null;

    const sectionMap = {
        'Estadísticas': 'estadisticas',
        'Usuarios': 'usuarios',
        'Historial de Transcripciones': 'historial-de-transcripciones',
        'Generación de Reportes': 'generacion-de-reportes',
        'Configuraciones': 'configuraciones'
    };

    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match]));
    }

    // Función para manejar la selección de tipo de reporte
    function handleReportOptionSelection() {
        reportOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            option.addEventListener('click', () => {
                reportOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                radio.checked = true;
            });
        });
    }

    // Función para generar reporte
    async function generateReport() {
        const selectedReportType = document.querySelector('input[name="reportType"]:checked');

        if (!selectedReportType) {
            showAlert('Por favor, selecciona un tipo de reporte');
            return;
        }

        try {
            const response = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: selectedReportType.value })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al generar reporte');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_${selectedReportType.value}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            showAlert('Reporte generado exitosamente');
        } catch (err) {
            console.error('Error generando reporte:', err);
            showAlert('Error al generar el reporte: ' + err.message);
        }
    }

    // Vincular la función al botón
    document.addEventListener('DOMContentLoaded', () => {
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', generateReport);
        } else {
            console.error('Botón generateReportBtn no encontrado');
        }
    });

    async function fetchAdminName() {
        try {
            const response = await fetch('/api/user');
            if (!response.ok) throw new Error('Error al obtener datos del usuario');
            const data = await response.json();
            if (data.nombre && data.isAdmin) {
                welcomeMessage.textContent = `Bienvenid@, ${data.nombre}`;
            } else {
                welcomeMessage.textContent = 'Bienvenido';
            }
        } catch (err) {
            console.error('Error fetching admin name:', err);
            welcomeMessage.textContent = 'Bienvenido';
            showAlert('Error al cargar el nombre del administrador');
        }
    }

    async function fetchUserCount() {
        try {
            const response = await fetch('/api/users/count');
            if (!response.ok) throw new Error('Error al obtener conteo de usuarios');
            const data = await response.json();
            userCountElement.textContent = data.count;
        } catch (err) {
            console.error('Error fetching user count:', err);
            userCountElement.textContent = 'Error';
            showAlert('Error al cargar el conteo de usuarios');
        }
    }

    async function fetchTranscriptionCount() {
        try {
            const response = await fetch('/api/transcriptions/count');
            if (!response.ok) throw new Error('Error al obtener conteo de transcripciones');
            const data = await response.json();
            transcriptionCountElement.textContent = data.count;
        } catch (err) {
            console.error('Error fetching transcription count:', err);
            transcriptionCountElement.textContent = 'Error';
            showAlert('Error al cargar el conteo de transcripciones');
        }
    }

    async function fetchLatestTranscription() {
        try {
            const response = await fetch('/api/transcriptions/latest');
            if (!response.ok) throw new Error('Error al obtener la última transcripción');
            const data = await response.json();
            latestTranscriptionElement.textContent = data.nombre_archivo;
        } catch (err) {
            console.error('Error fetching latest transcription:', err);
            latestTranscriptionElement.textContent = 'Error';
            showAlert('Error al cargar la última transcripción');
        }
    }

    async function fetchTopUsers() {
        try {
            const response = await fetch('/api/transcriptions/top-users');
            if (!response.ok) throw new Error('Error al obtener los top usuarios');
            const data = await response.json();
            renderTopUsers(data);
        } catch (err) {
            console.error('Error fetching top users:', err);
            showAlert('Error al cargar los top usuarios');
            renderTopUsers([]);
        }
    }

    async function fetchUsers() {
        try {
            loadingSpinner.classList.remove('hidden');
            const response = await fetch('/api/users');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error al obtener usuarios');
            }
            const data = await response.json();
            allUsers = data;
            renderUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
            usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-300">Error al cargar usuarios: ' + err.message + '</td></tr>';
            showAlert('Error al cargar los usuarios: ' + err.message);
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    async function fetchTranscriptions(filter = '') {
        try {
            transcriptionLoadingSpinner.classList.remove('hidden');
            const backendFilter = filter === 'longest' ? '' : filter;
            const response = await fetch(`/api/transcriptions/all?filter=${backendFilter}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error al obtener transcripciones');
            }
            let data = await response.json();

            if (filter === '' || filter === 'longest') {
                allTranscriptions = data;
            }

            if (filter === 'recent' && data.length > 0) {
                data = [data[0]];
            } else if (filter === 'oldest' && data.length > 0) {
                data = [data[0]];
            } else if (filter === 'longest' && data.length > 0) {
                const longest = data.reduce((max, curr) => {
                    const maxLength = max.texto_transcrito ? max.texto_transcrito.length : 0;
                    const currLength = curr.texto_transcrito ? curr.texto_transcrito.length : 0;
                    return currLength > maxLength ? curr : max;
                }, { texto_transcrito: '' });
                data = longest.texto_transcrito ? [longest] : [];
            } else if (filter === 'mostTranscriptions' && data.length > 0) {
                const userCounts = data.reduce((acc, curr) => {
                    acc[curr.nombre_usuario] = (acc[curr.nombre_usuario] || 0) + 1;
                    return acc;
                }, {});
                const topUser = Object.keys(userCounts).reduce((a, b) =>
                    userCounts[a] > userCounts[b] ? a : b
                );
                data = data.filter(t => t.nombre_usuario === topUser);
            }

            renderTranscriptions(data);
        } catch (err) {
            console.error('Error fetching transcriptions:', err);
            transcriptionsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-300">Error al cargar transcripciones: ' + err.message + '</td></tr>';
            showAlert('Error al cargar las transcripciones: ' + err.message);
        } finally {
            transcriptionLoadingSpinner.classList.add('hidden');
        }
    }

    function renderUsers(users) {
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-300">No hay usuarios disponibles</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                    <td>${escapeHTML(user.Id.toString())}</td>
                    <td>${escapeHTML(user.Nombre)}</td>
                    <td>${escapeHTML(user.Email)}</td>
                    <td>${escapeHTML(user.PasswordHash)}</td>
                    <td>${escapeHTML(user.FechaRegistro)}</td>
                `;
            row.addEventListener('click', () => {
                selectedUser = user;
                userIdElement.textContent = `ID del usuario: ${escapeHTML(user.Id.toString())}`;
                userCreatedElement.textContent = `Cuenta creada: ${escapeHTML(user.FechaRegistro)}`;
                userNameInput.value = escapeHTML(user.Nombre);
                userEmailInput.value = escapeHTML(user.Email);
                userPasswordInput.value = escapeHTML(user.PasswordHash);
                userNameInput.setAttribute('readonly', true);
                userEmailInput.setAttribute('readonly', true);
                userPasswordInput.setAttribute('readonly', true);
                userNameInput.classList.remove('editing');
                userEmailInput.classList.remove('editing');
                userPasswordInput.classList.remove('editing');
                editUserBtn.textContent = 'Editar';
                editUserBtn.classList.remove('save-btn');
                editUserBtn.classList.add('edit-btn');
                userModal.style.display = 'flex';
            });
            usersTableBody.appendChild(row);
        });
    }

    function renderTranscriptions(transcriptions) {
        transcriptionsTableBody.innerHTML = '';
        if (transcriptions.length === 0) {
            transcriptionsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-300">No hay transcripciones disponibles</td></tr>';
            return;
        }
        transcriptions.forEach(transcription => {
            const truncatedText = transcription.texto_transcrito && transcription.texto_transcrito.length > 50
                ? escapeHTML(transcription.texto_transcrito.substring(0, 50)) + '...'
                : escapeHTML(transcription.texto_transcrito || '');
            const row = document.createElement('tr');
            row.innerHTML = `
                    <td>${escapeHTML(transcription.id_transcripcion.toString())}</td>
                    <td>${escapeHTML(transcription.nombre_archivo || '')}</td>
                    <td>${escapeHTML(transcription.fecha_subida || '')}</td>
                    <td class="clickable" data-text="${escapeHTML(transcription.texto_transcrito || '')}">${truncatedText}</td>
                    <td>${escapeHTML(transcription.nombre_usuario || '')}</td>
                `;
            transcriptionsTableBody.appendChild(row);
        });

        document.querySelectorAll('.transcriptions-table .clickable').forEach(cell => {
            cell.addEventListener('click', () => {
                const fullText = cell.getAttribute('data-text');
                transcriptionText.value = fullText;
                transcriptionModal.style.display = 'flex';
                copyMessage.style.display = 'none';
            });
        });
    }

    function filterUsers(searchTerm) {
        if (!searchTerm) {
            renderUsers(allUsers);
            return;
        }
        const filteredUsers = allUsers.filter(user =>
            user.Id.toString().toLowerCase().includes(searchTerm) ||
            user.Nombre.toLowerCase().includes(searchTerm) ||
            user.Email.toLowerCase().includes(searchTerm)
        );
        renderUsers(filteredUsers);
        if (filteredUsers.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-300">No se encontraron resultados</td></tr>';
        }
    }

    function renderTopUsers(users) {
        topUsersList.innerHTML = '';
        const medals = [
            'img/medalla-de-oro.png',
            'img/medalla-de-plata.png',
            'img/medalla-de-bronce.png'
        ];
        if (users.length === 0) {
            topUsersList.innerHTML = '<p class="text-gray-300 text-center">No hay datos disponibles</p>';
            return;
        }
        users.forEach((user, index) => {
            if (index < 3) {
                const card = document.createElement('div');
                card.className = 'top-user-card';
                card.innerHTML = `
                        <img src="${medals[index]}" alt="Medalla ${index + 1}" class="top-user-image">
                        <h4 class="text-white font-extrabold text-xl mb-2">${escapeHTML(user.nombre_usuario)}</h4>
                        <p class="text-gray-300 text-base">Transcripciones: ${user.transcription_count}</p>
                    `;
                topUsersList.appendChild(card);
            }
        });
    }

    async function renderCharts() {
        try {
            const response = await fetch('/api/transcriptions/daily');
            if (!response.ok) throw new Error('Error al obtener transcripciones por día');
            const data = await response.json();

            const days = data.map(item => item.day);
            const counts = data.map(item => item.count);
            const total = counts.reduce((sum, count) => sum + count, 0);

            const barChartCtx = document.getElementById('barChart').getContext('2d');
            new Chart(barChartCtx, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Transcripciones por Día',
                        data: counts,
                        backgroundColor: '#F97316',
                        borderColor: '#EA580C',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Transcripciones',
                                color: '#000000',
                                font: { size: 12 }
                            },
                            ticks: { color: '#000000' }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Días de la Semana',
                                color: '#000000',
                                font: { size: 12 }
                            },
                            ticks: { color: '#000000' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#000000' }
                        }
                    }
                }
            });

            const pieChartCtx = document.getElementById('pieChart').getContext('2d');
            new Chart(pieChartCtx, {
                type: 'pie',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Distribución de Transcripciones',
                        data: counts,
                        backgroundColor: [
                            '#F97316',
                            '#EA580C',
                            '#D1D5DB',
                            '#9A3412',
                            '#2D3748',
                            '#1E293B',
                            '#4B5563'
                        ],
                        borderColor: '#FFFFFF',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#000000',
                                font: { size: 12 },
                                generateLabels: chart => {
                                    const data = chart.data;
                                    const total = data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        return {
                                            text: `${label}: ${percentage}%`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor[i],
                                            lineWidth: data.datasets[0].borderWidth,
                                            index: i
                                        };
                                    });
                                }
                            }
                        }
                    }
                }
            });
        } catch (err) {
            console.error('Error fetching daily transcription data:', err);
            showAlert('Error al cargar los datos de los gráficos');
            const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const counts = [0, 0, 0, 0, 0, 0, 0];

            const barChartCtx = document.getElementById('barChart').getContext('2d');
            new Chart(barChartCtx, {
                type: 'bar',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Transcripciones por Día',
                        data: counts,
                        backgroundColor: '#F97316',
                        borderColor: '#EA580C',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Transcripciones',
                                color: '#000000',
                                font: { size: 12 }
                            },
                            ticks: { color: '#000000' }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Días de la Semana',
                                color: '#000000',
                                font: { size: 12 }
                            },
                            ticks: { color: '#000000' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#000000' }
                        }
                    }
                }
            });

            const pieChartCtx = document.getElementById('pieChart').getContext('2d');
            new Chart(pieChartCtx, {
                type: 'pie',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Distribución de Transcripciones',
                        data: counts,
                        backgroundColor: [
                            '#F97316',
                            '#EA580C',
                            '#D1D5DB',
                            '#9A3412',
                            '#2D3748',
                            '#1E293B',
                            '#4B5563'
                        ],
                        borderColor: '#FFFFFF',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#000000',
                                font: { size: 12 },
                                generateLabels: chart => {
                                    return chart.data.labels.map((label, i) => ({
                                        text: `${label}: 0%`,
                                        fillStyle: chart.data.datasets[0].backgroundColor[i],
                                        strokeStyle: chart.data.datasets[0].borderColor[i],
                                        lineWidth: chart.data.datasets[0].borderWidth,
                                        index: i
                                    }));
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    async function updateUser() {
        if (!selectedUser) return;

        const updatedUser = {
            Id: selectedUser.Id,
            Nombre: userNameInput.value.trim(),
            Email: userEmailInput.value.trim(),
            PasswordHash: userPasswordInput.value.trim()
        };

        try {
            const response = await fetch(`/api/users/${selectedUser.Id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedUser)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error al actualizar usuario');
            }

            const data = await response.json();
            showAlert(data.message || 'Usuario actualizado correctamente');
            selectedUser = updatedUser;
            await fetchUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            showAlert('Error al actualizar el usuario: ' + err.message);
        }
    }

    async function deleteUser() {
        if (!selectedUser) return;

        try {
            const response = await fetch(`/api/users/${selectedUser.Id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error al eliminar usuario');
            }

            const data = await response.json();
            showAlert(data.message || 'Usuario eliminado correctamente');
            userModal.style.display = 'none';
            deleteConfirmModal.style.display = 'none';
            await fetchUsers();
            selectedUser = null;
        } catch (err) {
            console.error('Error deleting user:', err);
            showAlert('Error al eliminar el usuario: ' + err.message);
        }
    }

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        topUsersModal.style.display = 'none';
        transcriptionModal.style.display = 'none';
        userModal.style.display = 'none';
        deleteConfirmModal.style.display = 'none';
    });

    document.querySelectorAll('.sidebar-nav a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-nav a').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const sectionId = sectionMap[item.textContent.trim()];
            if (sectionId) {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            }
        });
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/user');
            if (!response.ok) throw new Error('Error al obtener datos del usuario');
            const data = await response.json();
            const nombre = data.nombre || 'Administrador';
            const logoutResponse = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const logoutData = await logoutResponse.json();
            showAlert(logoutData.message || `Sesión cerrada correctamente, ${nombre}`);
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } catch (err) {
            console.error('Error during logout:', err);
            showAlert('Error al cerrar sesión');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    });

    function showAlert(message) {
        alertMessage.textContent = message;
        alertModal.style.display = 'flex';
        setTimeout(() => {
            alertModal.style.display = 'none';
        }, 4000);
    }

    alertModal.addEventListener('click', () => {
        alertModal.style.display = 'none';
    });

    topUsersCard.addEventListener('click', () => {
        topUsersModal.style.display = 'flex';
        fetchTopUsers();
    });

    closeModalBtn.addEventListener('click', () => {
        topUsersModal.style.display = 'none';
    });

    topUsersModal.addEventListener('click', (e) => {
        if (e.target === topUsersModal) {
            topUsersModal.style.display = 'none';
        }
    });

    function showCopyMessage(message) {
        copyMessage.textContent = message;
        copyMessage.style.display = 'block';
        setTimeout(() => {
            copyMessage.style.display = 'none';
        }, 2000);
    }

    copyTranscriptionBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(transcriptionText.value);
            showCopyMessage('Texto copiado al portapapeles');
        } catch (err) {
            console.error('Error al copiar texto:', err);
            showCopyMessage('Error al copiar el texto');
        }
    });

    closeTranscriptionBtn.addEventListener('click', () => {
        transcriptionModal.style.display = 'none';
    });

    transcriptionModal.addEventListener('click', (e) => {
        if (e.target === transcriptionModal) {
            transcriptionModal.style.display = 'none';
        }
    });

    editUserBtn.addEventListener('click', async () => {
        if (editUserBtn.textContent === 'Editar') {
            userNameInput.removeAttribute('readonly');
            userEmailInput.removeAttribute('readonly');
            userPasswordInput.removeAttribute('readonly');
            userNameInput.classList.add('editing');
            userEmailInput.classList.add('editing');
            userPasswordInput.classList.add('editing');
            editUserBtn.textContent = 'Guardar';
            editUserBtn.classList.remove('edit-btn');
            editUserBtn.classList.add('save-btn');
        } else {
            userNameInput.classList.remove('editing');
            userEmailInput.classList.remove('editing');
            userPasswordInput.classList.remove('editing');
            const updatedUser = {
                Nombre: userNameInput.value,
                Email: userEmailInput.value,
                PasswordHash: userPasswordInput.value
            };

            try {
                const response = await fetch(`/api/users/${selectedUser.Id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUser)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || errorData.error || 'Error al actualizar usuario');
                }
                const data = await response.json();
                showAlert(data.message);
                allUsers = allUsers.map(user => user.Id === selectedUser.Id ? { ...user, ...updatedUser } : user);
                renderUsers(allUsers);
                userNameInput.setAttribute('readonly', true);
                userEmailInput.setAttribute('readonly', true);
                userPasswordInput.setAttribute('readonly', true);
                editUserBtn.textContent = 'Editar';
                editUserBtn.classList.remove('save-btn');
                editUserBtn.classList.add('edit-btn');
                userModal.style.display = 'none';
            } catch (err) {
                console.error('Error updating user:', err);
                showAlert('Error al actualizar usuario: ' + err.message);
            }
        }
    });

    // Add event listeners to remove editing class on blur
    [userNameInput, userEmailInput, userPasswordInput].forEach(input => {
        input.addEventListener('blur', () => {
            if (!input.hasAttribute('readonly')) {
                input.classList.add('editing');
            }
        });
        input.addEventListener('focus', () => {
            if (!input.hasAttribute('readonly')) {
                input.classList.add('editing');
            }
        });
    });

    // Remove editing class when clicking outside the inputs
    document.addEventListener('click', (e) => {
        if (!userModal.contains(e.target) && userModal.style.display === 'flex') {
            if (!userNameInput.hasAttribute('readonly')) {
                userNameInput.classList.remove('editing');
            }
            if (!userEmailInput.hasAttribute('readonly')) {
                userEmailInput.classList.remove('editing');
            }
            if (!userPasswordInput.hasAttribute('readonly')) {
                userPasswordInput.classList.remove('editing');
            }
        }
    });

    deleteUserBtn.addEventListener('click', () => {
        deleteConfirmMessage.textContent = `¿Estás seguro de eliminar la cuenta del usuario ${selectedUser.Nombre}?`;
        deleteConfirmModal.style.display = 'flex';
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/users/${selectedUser.Id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Error al eliminar usuario');
            }
            const data = await response.json();
            showAlert(data.message);
            allUsers = allUsers.filter(user => user.Id !== selectedUser.Id);
            renderUsers(allUsers);
            deleteConfirmModal.style.display = 'none';
            userModal.style.display = 'none';
            fetchUserCount();
        } catch (err) {
            console.error('Error deleting user:', err);
            showAlert('Error al eliminar usuario: ' + err.message);
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.style.display = 'none';
    });

    closeUserBtn.addEventListener('click', () => {
        userNameInput.classList.remove('editing');
        userEmailInput.classList.remove('editing');
        userPasswordInput.classList.remove('editing');
        userModal.style.display = 'none';
    });

    userModal.addEventListener('click', (e) => {
        if (e.target === userModal) {
            userNameInput.classList.remove('editing');
            userEmailInput.classList.remove('editing');
            userPasswordInput.classList.remove('editing');
            userModal.style.display = 'none';
        }
    });

    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
    });

    filterBtn.addEventListener('click', () => {
        const searchTerm = userSearch.value.trim().toLowerCase();
        if (!searchTerm) {
            showAlert('Ingresa un valor para filtrar');
            return;
        }
        filterUsers(searchTerm);
    });

    userSearch.addEventListener('input', () => {
        const searchTerm = userSearch.value.trim().toLowerCase();
        filterUsers(searchTerm);
    });

    applyTranscriptionFilter.addEventListener('click', () => {
        const filterValue = transcriptionFilter.value;
        if (!filterValue && filterValue !== '') {
            showAlert('Selecciona un filtro');
            return;
        }
        fetchTranscriptions(filterValue);
    });

    function handleReportOptionSelection() {
        const reportOptions = document.querySelectorAll('.report-option');
        reportOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove 'selected' class from all options
                reportOptions.forEach(opt => opt.classList.remove('selected'));
                // Add 'selected' class to the clicked option
                option.classList.add('selected');
                // Check the corresponding radio input
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
            });
        });
    }

    const icons = ['fa-user-shield', 'fa-user-cog', 'fa-user-lock', 'fa-user-check'];
    let currentIconIndex = 0;
    const adminIconEl = document.getElementById('adminIcon');

    function changeAdminIcon() {
        adminIconEl.style.opacity = 0;
        setTimeout(() => {
            adminIconEl.classList.remove(icons[currentIconIndex]);
            currentIconIndex = (currentIconIndex + 1) % icons.length;
            adminIconEl.classList.add(icons[currentIconIndex]);
            adminIconEl.style.opacity = 1;
        }, 500);
    }
    setInterval(changeAdminIcon, 3500);

    /*******************************************/

    /*******************************************/

    const adminId = document.getElementById('adminId');
    const adminRegistrationDate = document.getElementById('adminRegistrationDate');
    const adminNameInput = document.getElementById('adminNameInput');
    const adminEmailInput = document.getElementById('adminEmailInput');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const passwordToggle = document.getElementById('passwordToggle');
    const adminUpdateForm = document.getElementById('adminUpdateForm');
    const toggleEditButton = document.getElementById('toggleEditButton');
    const updateConfirmModal = document.getElementById('updateConfirmModal');
    const confirmUpdateBtn = document.getElementById('confirmUpdateBtn');
    const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');
    let isEditing = false;

    // Función para escapar HTML (seguridad)
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Función para cargar datos del admin
    async function fetchAdminDetails() {
        try {
            const response = await fetch('/api/admin/details');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al obtener datos del administrador');
            }
            const data = await response.json();
            adminId.textContent = `ID: ${escapeHTML(data.id.toString())}`;
            adminRegistrationDate.textContent = `Fecha de Registro: ${escapeHTML(data.fechaRegistro)}`;
            adminNameInput.value = escapeHTML(data.nombre);
            adminEmailInput.value = escapeHTML(data.email);
            adminPasswordInput.value = escapeHTML(data.password); // Cargar contraseña
            // Guardar valores originales para comparar cambios
            adminNameInput.setAttribute('data-original-nombre', data.nombre);
            adminEmailInput.setAttribute('data-original-email', data.email);
            adminPasswordInput.setAttribute('data-original-password', data.password);
        } catch (err) {
            console.error('Error fetching admin details:', err);
            showAlert('Error al cargar los datos del administrador: ' + err.message); // Changed from alert
            adminId.textContent = 'ID: Error';
            adminRegistrationDate.textContent = 'Fecha de Registro: Error';
            adminPasswordInput.placeholder = 'Error al cargar';
        }
    }

    // Evento para alternar visibilidad de la contraseña
    passwordToggle.addEventListener('click', () => {
        if (adminPasswordInput.type === 'password') {
            adminPasswordInput.type = 'text';
            passwordToggle.classList.remove('fa-eye');
            passwordToggle.classList.add('fa-eye-slash');
        } else {
            adminPasswordInput.type = 'password';
            passwordToggle.classList.remove('fa-eye-slash');
            passwordToggle.classList.add('fa-eye');
        }
    });

    // Evento para habilitar/deshabilitar edición
    toggleEditButton.addEventListener('click', () => {
        if (!isEditing) {
            // Habilitar campos
            adminNameInput.disabled = false;
            adminEmailInput.disabled = false;
            adminPasswordInput.disabled = false;
            toggleEditButton.textContent = 'Realizar Cambios';
            toggleEditButton.classList.remove('bg-orange-500', 'hover:bg-orange-600');
            toggleEditButton.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            isEditing = true;
        } else {
            // Validar antes de enviar el formulario
            const nombre = adminNameInput.value.trim();
            const email = adminEmailInput.value.trim();
            const password = adminPasswordInput.value.trim();

            // Validaciones básicas
            if (!nombre || !email) {
                showAlert('El nombre y el correo son requeridos.'); // Changed from alert
                return;
            }
            if (!/\S+@\S+\.\S+/.test(email)) {
                showAlert('El correo debe ser válido (ej: ejemplo@dominio.com).'); // Changed from alert
                return;
            }
            if (!password) {
                showAlert('La contraseña es requerida.'); // Changed from alert
                return;
            }
            // Verificar si hay cambios
            if (nombre === adminNameInput.getAttribute('data-original-nombre') &&
                email === adminEmailInput.getAttribute('data-original-email') &&
                password === adminPasswordInput.getAttribute('data-original-password')) {
                showAlert('No hay cambios para guardar.'); // Changed from alert
                return;
            }

            // Mostrar modal de confirmación
            updateConfirmModal.classList.remove('hidden');
        }
    });

    // Evento para confirmar actualización
    confirmUpdateBtn.addEventListener('click', async () => {
        const nombre = adminNameInput.value.trim();
        const email = adminEmailInput.value.trim();
        const password = adminPasswordInput.value.trim();
        const updateData = { nombre, email, password };

        try {
            const response = await fetch('/api/admin', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al actualizar datos');
            }
            const data = await response.json();
            showAlert(data.message);
            // Deshabilitar campos y restaurar botón
            adminNameInput.disabled = true;
            adminEmailInput.disabled = true;
            adminPasswordInput.disabled = true;
            toggleEditButton.textContent = 'Cambiar Datos';
            toggleEditButton.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            toggleEditButton.classList.add('bg-orange-500', 'hover:bg-orange-600');
            isEditing = false;
            // Recargar datos
            await fetchAdminDetails();
            updateConfirmModal.classList.add('hidden');
            // Refrescamos para ver los cambios reflejados en el panel
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (err) {
            console.error('Error updating admin:', err);
            showAlert('Error al actualizar los datos: ' + err.message); // Changed from alert
        }
    });

    // Evento para cancelar
    cancelUpdateBtn.addEventListener('click', () => {
        updateConfirmModal.classList.add('hidden');
    });

    // Cerrar modal al click fuera
    updateConfirmModal.addEventListener('click', (e) => {
        if (e.target === updateConfirmModal) {
            updateConfirmModal.classList.add('hidden');
        }
    });

    fetchAdminName();
    fetchUserCount();
    fetchTranscriptionCount();
    fetchLatestTranscription();
    fetchTopUsers();
    fetchUsers();
    fetchTranscriptions();
    renderCharts();
    handleReportOptionSelection();
    fetchAdminDetails();
})();