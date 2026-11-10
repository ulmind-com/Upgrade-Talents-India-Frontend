/**
 * User fingerprint / Face ID / passkey sign-in — server-backed (cross-device).
 *
 * The WebAuthn ceremony is verified by the backend (py_webauthn) and credentials
 * are stored against the user's account, so a passkey added on one device works
 * on their other devices too: discoverable (resident) credentials allow
 * usernameless login, and platform passkeys the OS syncs (same Google / Apple
 * account on a laptop and a phone) appear on every synced device with no
 * re-registration.
 *
 * Flow:
 *   - register(): signed in already, ask the server for options, run the platform
 *     authenticator, send the result back for verification + storage.
 *   - authenticate(): usernameless — ask the server for options, run the
 *     authenticator, send the assertion back; the server verifies it and returns
 *     the same login payload the password login returns. No email or password.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from "@simplewebauthn/browser";
import { passkeyApi, type PasskeyLoginResult } from "./api";

export function isSupported(): boolean {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

/** True when this device has a fingerprint / Face ID sensor we can enrol. */
export async function isPlatformAvailable(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** A readable default name for the device the passkey is being added on. */
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android phone";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "This device";
}

/** Register a new passkey for the signed-in user. */
export async function register(label?: string): Promise<void> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");
  const optionsJSON = await passkeyApi.registerOptions();
  const regResp = await startRegistration({ optionsJSON });
  await passkeyApi.registerVerify(regResp, label || deviceLabel());
}

/** Usernameless fingerprint login → the same payload the password login returns. */
export async function authenticate(): Promise<PasskeyLoginResult> {
  if (!isSupported()) throw new Error("This browser does not support passkeys.");
  const { challenge_id, options } = await passkeyApi.loginOptions();
  const authResp = await startAuthentication({ optionsJSON: options });
  return passkeyApi.loginVerify({ challenge_id, response: authResp });
}

/** List the signed-in user's registered passkeys. */
export async function listCredentials() {
  return passkeyApi.listCredentials();
}

/** Remove one registered passkey. */
export async function removeCredential(id: string) {
  return passkeyApi.deleteCredential(id);
}
