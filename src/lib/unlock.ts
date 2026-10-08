/**
 * Removes PDF encryption in the browser with qpdf compiled to WebAssembly.
 * pdf-lib cannot decrypt, and pdf.js can only render encrypted files, so this is what lets every
 * tool work on password-protected or permission-restricted PDFs. The wasm module is loaded on
 * first use and runs entirely on the device.
 */

/** Thrown when a PDF needs a password, or the one supplied is wrong. */
export class PasswordRequired extends Error {
  constructor(public wrong: boolean) {
    super(wrong ? 'Incorrect password' : 'Password required');
    this.name = 'PasswordRequired';
  }
}

/** Cheap pre-check: does the file mention an /Encrypt dictionary anywhere? */
export function looksEncrypted(b: Uint8Array): boolean {
  const end = b.length - 8;
  for (let i = 0; i <= end; i++) {
    if (
      b[i] === 47 && b[i + 1] === 69 && b[i + 2] === 110 && b[i + 3] === 99 &&
      b[i + 4] === 114 && b[i + 5] === 121 && b[i + 6] === 112 && b[i + 7] === 116
    ) return true;
  }
  return false;
}

export interface QpdfModule {
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array; unlink(path: string): void };
  callMain(args: string[]): number | void;
}

let wasmBinary: Promise<ArrayBuffer> | undefined;
function getWasm() {
  wasmBinary ??= import('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url').then(async (m) => {
    const res = await fetch(m.default);
    if (!res.ok) throw new Error('Could not load the unlock module.');
    return res.arrayBuffer();
  });
  wasmBinary.catch(() => { wasmBinary = undefined; }); // allow a retry after a network failure
  return wasmBinary;
}

/** Creates a fresh qpdf instance (one per operation keeps its virtual file system and state clean). */
export async function createQpdf(log: string[]): Promise<QpdfModule> {
  const [{ default: createModule }, binary, wasmUrl] = await Promise.all([
    import('@neslinesli93/qpdf-wasm'),
    getWasm(),
    import('@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'),
  ]);
  // The package's own typings are narrower than what Emscripten really accepts, so go through a loose signature.
  const create = createModule as unknown as (options: Record<string, unknown>) => Promise<unknown>;
  return (await create({
    noInitialRun: true,
    wasmBinary: binary,
    locateFile: (p: string) => (p.endsWith('.wasm') ? wasmUrl.default : p),
    print: (s: string) => log.push(String(s)),
    printErr: (s: string) => log.push(String(s)),
  })) as unknown as QpdfModule;
}

/** Runs qpdf and returns its exit code. Emscripten reports a non-zero exit as a thrown ExitStatus. */
export function runQpdf(qpdf: QpdfModule, args: string[]): number {
  try {
    return qpdf.callMain(args) ?? 0;
  } catch (e) {
    const status = (e as { status?: unknown } | null)?.status;
    return typeof status === 'number' ? status : 2;
  }
}

/** Returns an unencrypted copy of the PDF. Throws PasswordRequired for a missing or wrong password. */
export async function decryptPdf(bytes: Uint8Array, password = ''): Promise<Uint8Array> {
  const log: string[] = [];
  const qpdf = await createQpdf(log);
  qpdf.FS.writeFile('/in.pdf', bytes);
  const code = runQpdf(qpdf, [`--password=${password}`, '--decrypt', '/in.pdf', '/out.pdf']);

  const text = log.join('\n').toLowerCase();
  if (/invalid password|incorrect password|password.*(wrong|required)/.test(text)) throw new PasswordRequired(!!password);
  let out: Uint8Array | undefined;
  try { out = qpdf.FS.readFile('/out.pdf'); } catch { /* not written */ }
  // qpdf exits 3 for warnings but still writes a usable file; 2 means it failed.
  if (!out || !out.length || code === 2) throw new Error(log.find((l) => l.trim()) ?? 'Could not remove the protection.');
  return out.slice();
}
