// Run with: npm run test:names   (Node 22.18+ loads the .ts file directly; no extra dependencies)
import assert from 'node:assert/strict';
import { suggestName, nameFor, sanitizeStem, toFileName, convertFileName, stripDocx, pageNames, docKey, SUFFIX, MAX_FILE_NAME } from '../src/lib/filename.ts';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok  ', name); };

t('suffixes for every operation', () => {
  const expect = { merge: 'merged', organize: 'organized', extract: 'extract', crop: 'cropped', compress: 'compressed', ocr: 'searchable', unlock: 'unlocked', protect: 'protected' };
  assert.deepEqual(SUFFIX, expect);
  for (const [op, s] of Object.entries(expect)) assert.equal(suggestName('Report.pdf', op), `Report-${s}.pdf`);
});

t('uppercase and mixed-case .PDF extensions are removed, output is lowercase .pdf', () => {
  assert.equal(suggestName('SCAN.PDF', 'compress'), 'SCAN-compressed.pdf');
  assert.equal(suggestName('scan.Pdf', 'ocr'), 'scan-searchable.pdf');
  assert.equal(suggestName('a.pdf.PDF', 'crop'), 'a-cropped.pdf');
  assert.equal(toFileName('x.PDF'), 'x.pdf');
  assert.equal(toFileName('x.pdf.pdf'), 'x.pdf');
  assert.equal(toFileName('x'), 'x.pdf');
});

t('only a trailing .pdf is stripped', () => {
  assert.equal(suggestName('my.pdf.backup.pdf', 'unlock'), 'my.pdf.backup-unlocked.pdf');
  assert.equal(suggestName('notes.v2', 'protect'), 'notes.v2-protected.pdf');
});

t('illegal characters are removed', () => {
  assert.equal(sanitizeStem('a/b\\c:d*e?f"g<h>i|j'), 'abcdefghij');
  assert.equal(suggestName('Q3: "Plan" <draft>?.pdf', 'organize'), 'Q3 Plan draft-organized.pdf');
  assert.equal(sanitizeStem('tab\there\u0000x\u001f'), 'tabherex');
  for (const bad of ['a/b', 'c:d', 'e*f', 'g?h', 'i"j', 'k<l', 'm>n', 'o|p', 'q\\r']) assert.doesNotMatch(toFileName(bad), /[/\\:*?"<>|]/);
});

t('spaces and dots are trimmed at both ends, inner ones stay', () => {
  assert.equal(sanitizeStem('  ..my file.. . '), 'my file');
  assert.equal(sanitizeStem('a . b'), 'a . b');
  assert.equal(toFileName(' .report. .pdf. '), 'report.pdf');
});

t('empty or unusable names fall back to "document"', () => {
  for (const s of ['', '   ', '...', '/\\:*', '.pdf', '.PDF', ' . pdf ']) assert.equal(sanitizeStem(s), s === ' . pdf ' ? 'pdf' : 'document', JSON.stringify(s));
  assert.equal(suggestName('', 'merge'), 'document-merged.pdf');
  assert.equal(suggestName('???.pdf', 'compress'), 'document-compressed.pdf');
  assert.equal(toFileName(''), 'document.pdf');
});

t('Windows reserved device names are made safe', () => {
  assert.equal(toFileName('CON'), 'CON_.pdf');
  assert.equal(toFileName('nul.pdf'), 'nul_.pdf');
  assert.equal(toFileName('console'), 'console.pdf');
});

t('long names are limited to 120 characters including .pdf, and the suffix survives', () => {
  const long = 'x'.repeat(500) + '.pdf';
  const s = suggestName(long, 'compress');
  assert.ok(s.length <= MAX_FILE_NAME, `length ${s.length}`);
  assert.ok(s.endsWith('-compressed.pdf'));
  assert.equal(toFileName('y'.repeat(300)).length, MAX_FILE_NAME);
  assert.equal(suggestName('z'.repeat(500), 'organize').length, MAX_FILE_NAME);
  // trailing space/dot exposed by the cut is trimmed
  const cut = toFileName('a'.repeat(115) + ' . . . . . more');
  assert.doesNotMatch(cut, /[ .]\.pdf$/);
});

t('long names with multi-byte characters are not cut in half', () => {
  const emoji = '📄'.repeat(200);
  const s = toFileName(emoji);
  assert.ok(s.length <= MAX_FILE_NAME);
  assert.doesNotMatch(s, /[\ud800-\udbff](?![\udc00-\udfff])/); // no lone high surrogate
  assert.doesNotMatch(s, /(?<![\ud800-\udbff])[\udc00-\udfff]/); // no lone low surrogate
  assert.match(toFileName('é'.repeat(300)), /^é+\.pdf$/);
});

t('non-ASCII names are kept (and composed)', () => {
  assert.equal(suggestName('Résumé 履歴書.PDF', 'merge'), 'Résumé 履歴書-merged.pdf');
  assert.equal(sanitizeStem('e\u0301'), '\u00e9');
});

t('always exactly one .pdf', () => {
  for (const raw of ['a', 'a.pdf', 'a.PDF', 'a.pdf.pdf', 'a..pdf', '  a.pdf  ', 'A.Pdf.']) {
    const f = toFileName(raw);
    assert.match(f, /^[^.].*\.pdf$/s, f);
    assert.doesNotMatch(f, /\.pdf\.pdf$/i, f);
  }
});

t('merge: one name for the same file, plain "merged" for different files', () => {
  assert.equal(nameFor('merge', ['a.pdf', 'b.pdf'], true), 'merged.pdf');
  assert.equal(nameFor('merge', ['A.pdf', 'a.PDF'], true), 'A-merged.pdf');
  assert.equal(nameFor('merge', ['solo.pdf'], true), 'solo-merged.pdf');
  assert.equal(nameFor('organize', ['a.pdf', 'b.pdf'], true), 'a-organized.pdf'); // other tools use the first file
});

t('automatic naming off keeps the first file name', () => {
  assert.equal(nameFor('merge', ['Quarterly.PDF', 'b.pdf'], false), 'Quarterly.pdf');
  assert.equal(nameFor('compress', ['bad:name?.pdf'], false), 'badname.pdf');
  assert.equal(nameFor('compress', [], false), 'document.pdf');
});

t('merge name follows the CURRENT page order', () => {
  const docs = { d1: { name: 'first.pdf' }, d2: { name: 'second.pdf' } };
  const pg = (id) => ({ docId: id });
  assert.deepEqual(pageNames([pg('d1'), pg('d2'), pg('d1')], docs), ['first.pdf', 'second.pdf']);
  assert.deepEqual(pageNames([pg('d2'), pg('d1')], docs), ['second.pdf', 'first.pdf']);
  assert.equal(nameFor('organize', pageNames([pg('d2'), pg('d1')], docs), true), 'second-organized.pdf');
  assert.equal(docKey([pg('d1'), pg('d2')]), docKey([pg('d2'), pg('d1'), pg('d2')])); // reordering does not count as new files
  assert.notEqual(docKey([pg('d1')]), docKey([pg('d1'), pg('d2')]));
});

t('converter file names for pdf and docx avoid duplicate extensions', () => {
  assert.equal(convertFileName('Homework.pdf', 'docx'), 'Homework.docx');
  assert.equal(convertFileName('Essay.docx', 'pdf'), 'Essay.pdf');
  assert.equal(convertFileName('Report.PDF', 'docx'), 'Report.docx');
  assert.equal(convertFileName('Notes.DOCX', 'pdf'), 'Notes.pdf');
  assert.equal(convertFileName('bad:name?.pdf', 'docx'), 'badname.docx');
  assert.equal(convertFileName('paper.docx.pdf', 'docx'), 'paper.docx');
  assert.equal(convertFileName('doc.pdf.docx', 'pdf'), 'doc.pdf');
  assert.equal(convertFileName('', 'docx'), 'document.docx');
  assert.equal(convertFileName('', 'pdf'), 'document.pdf');
  assert.equal(stripDocx('assignment.DOCX'), 'assignment');
});

console.log(`\n${n} groups passed`);
