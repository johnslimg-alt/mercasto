const REGISTRATION_EVENT_PREFIX = 'register_user_';

function randomSuffix() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const random = Math.random().toString(16).slice(2);
  return `${Date.now().toString(36)}-${random}`;
}

export function createRegistrationMetaEventId() {
  return `${REGISTRATION_EVENT_PREFIX}${randomSuffix()}`.slice(0, 120);
}
