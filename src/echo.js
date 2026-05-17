import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const token = localStorage.getItem('auth_token');
const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'mercasto_key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8082,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8082,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBase}/broadcasting/auth`,
    auth: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
});

export default echo;
