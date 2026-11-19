const VOICE_IDENTITY_PREFIX = "agent_cybr_01_";

export function getVoiceIdentity(userId: string): string {
  const identity = `${VOICE_IDENTITY_PREFIX}${userId}`;
  if (!/^[A-Za-z0-9_]{1,121}$/.test(identity)) {
    throw new Error("No se pudo construir una identidad de voz válida.");
  }

  return identity;
}

export function getUserIdFromVoiceIdentity(identity: string): string | null {
  if (!identity.startsWith(VOICE_IDENTITY_PREFIX)) {
    return null;
  }

  const userId = identity.slice(VOICE_IDENTITY_PREFIX.length);
  return userId && /^[A-Za-z0-9_-]+$/.test(userId) ? userId : null;
}
