import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'mercasto_key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8082,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8082,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
});

export default echo;