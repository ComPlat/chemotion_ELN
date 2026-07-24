import expect from 'expect';
import { CON_STATE, isConvertible } from 'src/apps/mydb/elements/list/AttachmentList';

// Regression coverage: the re-run button must only be offered on the originally-uploaded
// file, not on the attachments the converter itself produces (the bagit/zip conversion
// output), which only ever carry CONVERTED or COMPLETED.
describe('AttachmentList.isConvertible', () => {
  it('is true for original-file states the converter can re-run', () => {
    expect(isConvertible({ con_state: CON_STATE.WAIT })).toBe(true);
    expect(isConvertible({ con_state: CON_STATE.NMR })).toBe(true);
    expect(isConvertible({ con_state: CON_STATE.PROCESSED })).toBe(true);
    expect(isConvertible({ con_state: CON_STATE.ERROR })).toBe(true);
  });

  it('is false for the converter-produced (derived) attachment states', () => {
    expect(isConvertible({ con_state: CON_STATE.CONVERTED })).toBe(false);
    expect(isConvertible({ con_state: CON_STATE.COMPLETED })).toBe(false);
  });

  it('is false when the converter never picked the attachment up', () => {
    expect(isConvertible({ con_state: CON_STATE.NONE })).toBe(false);
    expect(isConvertible({ con_state: null })).toBe(false);
    expect(isConvertible({ con_state: undefined })).toBe(false);
  });
});
