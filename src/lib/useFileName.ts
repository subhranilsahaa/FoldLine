import { useState } from 'react';
import { nameFor, stripPdf, toFileName, type Operation } from './filename';
import { useAutoName } from './settings';

/**
 * State for one rename field. Until the person types, the field follows the suggestion (it changes with
 * the operation, the first file and the "Name files automatically" setting). Once they type, their text
 * stays until Reset is pressed or different files are loaded (`key` changes).
 *
 * `stem` is the raw text shown in the field; `filename` is the safe, final name that is downloaded,
 * shown in the success card and used in the button's aria-label.
 */
export function useFileName(operation: Operation, names: string[], key: string) {
  const [auto] = useAutoName();
  const [typed, setTyped] = useState<{ key: string; text: string } | null>(null);

  const suggested = nameFor(operation, names, auto);
  const text = typed && typed.key === key ? typed.text : null;
  const stem = text ?? stripPdf(suggested);

  return {
    stem,
    filename: text === null ? suggested : toFileName(text),
    suggested,
    edited: text !== null,
    auto,
    setStem: (value: string) => setTyped({ key, text: value }),
    reset: () => setTyped(null),
  };
}

export type FileNameState = ReturnType<typeof useFileName>;
