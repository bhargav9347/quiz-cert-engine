import { fetchAPI, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;

            try {
                await fetchAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                window.location.href = '/dashboard.html';
            } catch (err) {
                // Error handled by fetchAPI toast
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const full_name = e.target.full_name.value;
            const email = e.target.email.value;
            const password = e.target.password.value;
            const confirm_password = e.target.confirm_password.value;

            if (password !== confirm_password) {
                return showToast('Passwords do not match', 'error');
            }

            try {
                await fetchAPI('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ full_name, email, password })
                });
                showToast('Registration successful! Please login.');
                setTimeout(() => window.location.href = '/index.html', 2000);
            } catch (err) { }
        });
    }
});
