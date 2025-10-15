const nombreInput = document.getElementById('nombre');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerButton = document.querySelector('.custom-button');
const alertModal = document.getElementById('alertModal');
const alertMessage = document.getElementById('alertMessage');

registerButton.addEventListener('click', async () => {
    const nombre = nombreInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validación básica: campos obligatorios
    if (!nombre || !email || !password) {
        alertMessage.textContent = "Todos los campos son obligatorios";
        alertModal.style.display = "flex";
        return;
    }

    // VALIDACIÓN DEL NOMBRE: Solo letras, acentos, ñ, espacios (SIN NÚMEROS)
    const nombreRegex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/;
    if (!nombreRegex.test(nombre)) {
        alertMessage.textContent = "El nombre solo puede contener letras, acentos y ñ (sin números)";
        alertModal.style.display = "flex";
        return;
    }

    // VALIDACIÓN DEL EMAIL:
    // 1. Debe terminar en @hrlatam.com
    if (!email.endsWith("@hrlatam.com")) {
        alertMessage.textContent = "El email debe terminar en @hrlatam.com";
        alertModal.style.display = "flex";
        return;
    }

    // 2. Exactamente UN SOLO @
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
        alertMessage.textContent = "El email debe tener exactamente un @";
        alertModal.style.display = "flex";
        return;
    }

    // 3. Formato básico de email válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
    if (!emailRegex.test(email)) {
        alertMessage.textContent = "Formato de email inválido";
        alertModal.style.display = "flex";
        return;
    }

    // VALIDACIÓN PASSWORD: Mínimo 6 caracteres
    if (password.length < 6) {
        alertMessage.textContent = "La contraseña debe tener al menos 6 caracteres";
        alertModal.style.display = "flex";
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });

        const data = await res.json();
        alertMessage.textContent = data.message || data.error;
        alertModal.style.display = 'flex';

        if (res.ok) {
            // Limpiar campos si éxito
            nombreInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
        }
    } catch (error) {
        alertMessage.textContent = '❌ Error de conexión con el servidor';
        alertModal.style.display = 'flex';
    }
});

// Cerrar modal al hacer clic fuera
alertModal.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

// Toggle visibilidad contraseña
document.querySelector('.toggle-password').addEventListener('click', function () {
    const passwordInput = document.getElementById('password');
    const icon = this;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
});

// Enter para registrar
[nombreInput, emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            registerButton.click();
        }
    });
});