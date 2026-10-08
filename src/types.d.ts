// qpdf compiled to WebAssembly ships without type declarations.
declare module '@neslinesli93/qpdf-wasm' {
  const createModule: (options?: Record<string, unknown>) => Promise<unknown>;
  export default createModule;
}
declare module '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url' {
  const url: string;
  export default url;
}
interface ImportMetaEnv {
  /** Optional self-hosted base for the OCR engine: expects worker.min.js, core/ and lang/ below it. */
  readonly VITE_OCR_BASE_URL?: string;
}
