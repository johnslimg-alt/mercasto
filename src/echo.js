import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const isSecure = window.location.protocol === 'https:';
const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || (isSecure ? 443 : 80));

const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'mercasto_key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: isSecure,
    enabledTransports: isSecure ? ['wss'] : ['ws'],
});

export default echo;
