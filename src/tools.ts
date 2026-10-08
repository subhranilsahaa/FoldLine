import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { META, type ToolMeta } from './tools-meta';

export interface ToolDef extends ToolMeta {
  /** Preloads the tool's chunk (used before hydration). */
  load: () => Promise<unknown>;
  component: LazyExoticComponent<ComponentType>;
}

/**
 * Live tools, in sidebar order. Add a tool: create src/tools/<name>/, add copy to
 * tools-meta.ts, add an entry here. Planned tools live in src/future-tools/.
 */
const organizeChunk = () => import('./tools/organize/OrganizeTool');
const compressChunk = () => import('./tools/compress/CompressTool');
const cropChunk = () => import('./tools/crop/CropTool');
const ocrChunk = () => import('./tools/ocr/OcrTool');
const unlockChunk = () => import('./tools/unlock/UnlockTool');
const protectChunk = () => import('./tools/protect/ProtectTool');
const convertChunk = () => import('./tools/convert/ConvertTool');

export const TOOLS: ToolDef[] = [
  { ...META.merge, load: organizeChunk, component: lazy(() => organizeChunk().then((m) => ({ default: m.MergeTool }))) },
  { ...META.organize, load: organizeChunk, component: lazy(() => organizeChunk().then((m) => ({ default: m.OrganizeTool }))) },
  { ...META.extract, load: organizeChunk, component: lazy(() => organizeChunk().then((m) => ({ default: m.ExtractTool }))) },
  { ...META.crop, load: cropChunk, component: lazy(cropChunk) },
  { ...META.compress, load: compressChunk, component: lazy(compressChunk) },
  { ...META.ocr, load: ocrChunk, component: lazy(ocrChunk) },
  { ...META.unlock, load: unlockChunk, component: lazy(unlockChunk) },
  { ...META.protect, load: protectChunk, component: lazy(protectChunk) },
  { ...META.convert, load: convertChunk, component: lazy(convertChunk) },
];
