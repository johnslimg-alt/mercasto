import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const token = localStorage.getItem('auth_token');
const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';
const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || (window.location.protocol === 'https:' ? 'https' : 'http');
const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || (reverbScheme === 'https' ? 443 : 80));
const reverbHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'mercasto_key',
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: reverbScheme === 'https',
    enabledTransports: reverbScheme === 'https' ? ['wss'] : ['ws'],
    authEndpoint: `${apiBase}/broadcasting/auth`,
    auth: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
});

export default echo;
