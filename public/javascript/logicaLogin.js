(function () {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.querySelector('.custom-button');
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');

    loginButton.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showAlert("Por favor, completa todos los campos");
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                showAlert(data.message);
                setTimeout(() => {
                    window.location.href = data.redirect || '/main';
                }, 1500);
            } else {
                showAlert(data.message || "Usuario o contraseña incorrectos");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error al conectarse al servidor");
        }
    });

    function showAlert(message) {
        alertMessage.textContent = message;
        alertModal.style.display = 'flex';
        setTimeout(() => {
            alertModal.style.display = 'none';
        }, 2000);
    }

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

    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                loginButton.click();
            }
        });
    });
})();