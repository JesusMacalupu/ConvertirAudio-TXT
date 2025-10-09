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

    if (!nombre || !email || !password) {
        alertMessage.textContent = "⚠️ Todos los campos son obligatorios";
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
            nombreInput.value = '';
            emailInput.value = '';
            passwordInput.value = '';
        }
    } catch (error) {
        alertMessage.textContent = '❌ Error de conexión con el servidor';
        alertModal.style.display = 'flex';
    }
});

// Close modal on click
alertModal.addEventListener('click', () => {
    alertModal.style.display = 'none';
});

// Toggle password visibility
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

// Trigger register button on Enter key press
[nombreInput, emailInput, passwordInput].forEach(input => {
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            registerButton.click();
        }
    });
});