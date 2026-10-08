/**
 * Adds a password to a PDF with qpdf compiled to WebAssembly (AES-256), entirely on the device.
 * Uses the same loader as unlock.ts. Source files are already decrypted when opened, so a
 * protected file's bytes can go straight into this.
 */
import { createQpdf, runQpdf } from './unlock';

export interface ProtectOptions {
  /** needed to open the file */
  userPassword: string;
  /** controls the restrictions; defaults to the user password's value when omitted */
  ownerPassword?: string;
  permissions: { print: boolean; copy: boolean; edit: boolean };
}

/**
 * qpdf takes each --encrypt value as its own argument: user, owner, key length, then the flags up to `--`.
 * An empty owner password would let anyone lift the restrictions, so we fall back to a random one
 * when restrictions are requested without an owner password.
 */
export function buildEncryptArgs(opts: ProtectOptions, input: string, output: string): string[] {
  const { print, copy, edit } = opts.permissions;
  const restricted = !print || !copy || !edit;
  const owner = opts.ownerPassword?.trim()
    ? opts.ownerPassword
    : restricted ? randomPassword() : opts.userPassword;
  const args = ['--encrypt', opts.userPassword, owner, '256'];
  if (!print) args.push('--print=none');
  if (!copy) args.push('--extract=n');
  // --modify=none covers assembling, annotating, form filling and other changes in one flag.
  if (!edit) args.push('--modify=none');
  // 256-bit keys always use AES (--use-aes only exists for 128-bit), so none is passed.
  args.push('--', input, output);
  return args;
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Returns an encrypted copy of the PDF. */
export async function encryptPdf(bytes: Uint8Array, opts: ProtectOptions): Promise<Uint8Array> {
  if (!opts.userPassword) throw new Error('Enter a password first.');
  const log: string[] = [];
  const qpdf = await createQpdf(log);
  qpdf.FS.writeFile('/in.pdf', bytes);
  const code = runQpdf(qpdf, buildEncryptArgs(opts, '/in.pdf', '/out.pdf'));
  let out: Uint8Array | undefined;
  try { out = qpdf.FS.readFile('/out.pdf'); } catch { /* not written */ }
  try { qpdf.FS.unlink('/in.pdf'); } catch { /* ignore */ }
  if (!out || !out.length || code === 2) throw new Error(log.find((l) => l.trim()) ?? 'Could not add the password.');
  return out.slice();
}
