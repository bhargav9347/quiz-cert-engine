export const API_BASE = '/api';

export const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'badge-success' : 'badge-danger'}`;
    toast.style.backgroundColor = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

export const fetchAPI = async (url, options = {}) => {
    try {
        const response = await fetch(`${API_BASE}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        return data;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
};

export const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};
