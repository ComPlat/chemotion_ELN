/* global describe, it, beforeEach */
import expect from 'expect';
import { createQuillImageHandler } from 'src/utilities/quillImageHandler';

// Minimal Quill stub — just the surface createQuillImageHandler actually
// uses: `root` for paste/drop listeners, `clipboard.addMatcher` for the
// paste-guard, `getContents` for the orphan reconciler, and `on` for the
// text-change subscription. Delta is stored as `{ ops: [...] }` and updated
// by simulateEdit() — the reconciler is what we're testing.
function makeStubQuill(initialOps = []) {
  const listeners = { 'text-change': [] };
  let contents = { ops: initialOps.slice() };
  const root = {
    _handlers: {},
    addEventListener(evt, fn) { this._handlers[evt] = fn; },
    ownerDocument: { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
  };
  return {
    root,
    clipboard: { addMatcher() {} },
    getContents: () => contents,
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    // test helpers
    simulateEdit(nextOps, source = 'user') {
      contents = { ops: nextOps.slice() };
      (listeners['text-change'] || []).forEach((fn) => fn(null, null, source));
    },
  };
}

describe('createQuillImageHandler orphan reconciler', () => {
  let attachments;
  let quill;

  beforeEach(() => {
    attachments = [
      { identifier: 'img-1', filename: 'a.png', is_deleted: false, is_image_field: true },
      { identifier: 'file-1', filename: 'b.pdf', is_deleted: false, is_image_field: true },
      { identifier: 'unrelated', filename: 'c.txt', is_deleted: false, is_image_field: true },
    ];
  });

  function install(initialOps) {
    quill = makeStubQuill(initialOps);
    const seen = [];
    const handler = createQuillImageHandler({
      getAttachments: () => attachments,
      onAttachmentsChange: (next) => { attachments = next; seen.push(next); },
    });
    handler.install(quill);
    return { changes: seen };
  }

  it('marks the attachment deleted when its inline image blot is removed by the user', () => {
    const { changes } = install([
      { insert: { 'attachment-image': { attachment_identifier: 'img-1', filename: 'a.png' } } },
      { insert: '\n' },
    ]);

    // User deletes the embed → delta shrinks to just the trailing newline.
    quill.simulateEdit([{ insert: '\n' }], 'user');

    expect(changes.length).toBe(1);
    const removed = changes[0].find((a) => a.identifier === 'img-1');
    expect(removed).toBeDefined();
    expect(removed.is_deleted).toBe(true);
    // Untouched attachments stay untouched.
    expect(changes[0].find((a) => a.identifier === 'unrelated').is_deleted).toBe(false);
  });

  it('marks the file pill deleted when its blot is removed', () => {
    const { changes } = install([
      { insert: 'before ' },
      { insert: { 'attachment-file': { attachment_identifier: 'file-1', filename: 'b.pdf' } } },
      { insert: " after\n" },
    ]);

    quill.simulateEdit([{ insert: "before  after\n" }], 'user');

    expect(changes.length).toBe(1);
    expect(changes[0].find((a) => a.identifier === 'file-1').is_deleted).toBe(true);
  });

  it('handles multiple identifiers removed in a single edit', () => {
    const { changes } = install([
      { insert: { 'attachment-image': { attachment_identifier: 'img-1', filename: 'a.png' } } },
      { insert: { 'attachment-file': { attachment_identifier: 'file-1', filename: 'b.pdf' } } },
      { insert: '\n' },
    ]);

    quill.simulateEdit([{ insert: '\n' }], 'user');

    // One onAttachmentsChange fires per text-change, carrying both flips.
    expect(changes.length).toBe(1);
    expect(changes[0].find((a) => a.identifier === 'img-1').is_deleted).toBe(true);
    expect(changes[0].find((a) => a.identifier === 'file-1').is_deleted).toBe(true);
  });

  it('does not fire onAttachmentsChange when the user edits surrounding text', () => {
    const { changes } = install([
      { insert: { 'attachment-image': { attachment_identifier: 'img-1', filename: 'a.png' } } },
      { insert: "hello\n" },
    ]);

    quill.simulateEdit([
      { insert: { 'attachment-image': { attachment_identifier: 'img-1', filename: 'a.png' } } },
      { insert: "hello world\n" },
    ], 'user');

    expect(changes.length).toBe(0);
  });

  it('ignores non-user text-change events (React re-renders, programmatic setContents)', () => {
    const { changes } = install([
      { insert: { 'attachment-image': { attachment_identifier: 'img-1', filename: 'a.png' } } },
      { insert: '\n' },
    ]);

    // A parent React re-render calls setContents which fires text-change
    // with source === 'api' or 'silent'. Must not be interpreted as a user
    // delete — otherwise every re-render would nuke unrelated attachments.
    quill.simulateEdit([{ insert: '\n' }], 'api');

    expect(changes.length).toBe(0);
    // And the reconciler resyncs its snapshot from the new contents, so a
    // subsequent user edit that re-adds the blot won't misfire either.
    quill.simulateEdit([{ insert: '\n' }], 'user');
    expect(changes.length).toBe(0);
  });
});
