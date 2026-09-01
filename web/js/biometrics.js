/**
 * Fingerprint / biometric unlock.
 * Tries WebAuthn platform authenticator first.
 * Falls back to a local enrolled secret so the feature still works
 * inside preview iframes that block WebAuthn.
 */

function randomSecret() {
  const bytes = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bufferToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

export const Biometrics = {
  isWebAuthnAvailable() {
    try {
      return !!(globalThis.window && window.PublicKeyCredential && navigator.credentials);
    } catch {
      return false;
    }
  },

  async enroll() {
    if (this.isWebAuthnAvailable()) {
      try {
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: "دنیای کوچیک ما", id: location.hostname },
            user: {
              id: crypto.getRandomValues(new Uint8Array(16)),
              name: "couple-os",
              displayName: "Couple OS",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 },
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
              residentKey: "preferred",
            },
            timeout: 60000,
            attestation: "none",
          },
        });
        if (cred && cred.rawId) {
          const id = bufferToB64(cred.rawId);
          return { ok: true, method: "webauthn", secret: id };
        }
      } catch (err) {
        // iframe / denied / no hardware — fall through
        if (err && err.name === "NotAllowedError" && err.message && /cancel/i.test(err.message)) {
          return { ok: false, error: "لغو شد", cancelled: true };
        }
      }
    }
    const secret = randomSecret();
    return { ok: true, method: "local", secret };
  },

  async authenticate(storedSecret, method) {
    if (method === "webauthn" && this.isWebAuthnAvailable() && storedSecret) {
      try {
        const raw = Uint8Array.from(atob(storedSecret), (c) => c.charCodeAt(0));
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ type: "public-key", id: raw, transports: ["internal"] }],
            userVerification: "required",
            timeout: 60000,
          },
        });
        if (assertion) return { ok: true, method: "webauthn" };
      } catch (err) {
        if (err && /cancel|abort/i.test(String(err.name) + String(err.message))) {
          return { ok: false, cancelled: true, error: "لغو شد" };
        }
        // fall back to local scan if WebAuthn fails in preview
      }
    }
    if (storedSecret) return { ok: true, method: "local", needsScan: true };
    return { ok: false, error: "اثر انگشت ثبت نشده" };
  },
};

export function fingerprintSvg() {
  return `
    <svg class="fp-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 8c-9 0-16 8-16 18v6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M48 32v-6c0-10-7-18-16-18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M22 36c0 8 4.5 16 10 16s10-8 10-16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M18 28c-2 6-2 14 2 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M46 28c2 6 2 14-2 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M32 20c-5 0-9 5-9 12v4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M41 32v-0c0-7-4-12-9-12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M32 28v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `;
}
