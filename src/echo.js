import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://mercasto.com/api';

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
let echo = null;

if (reverbKey) {
    echo = new Echo({
        broadcaster: 'reverb',
        key: reverbKey,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel, options) => {
            return {
                authorize: (socketId, callback) => {
                    fetch(`${API_URL}/broadcasting/auth`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                        },
                        body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
                    })
                    .then(response => response.json())
                    .then(data => callback(false, data))
                    .catch(error => callback(true, error));
                }
            };
        },
    });
} else {
    // Уведомление скрыто: Real-time features disabled (no key provided).
}

export default echo;