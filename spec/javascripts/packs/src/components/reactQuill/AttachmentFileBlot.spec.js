/* global describe, it */
import expect from 'expect';
import AttachmentFileBlot from 'src/components/reactQuill/AttachmentFileBlot';

describe('AttachmentFileBlot', () => {
  // Regression guard: the pill's create() previously interpolated the
  // user-controlled filename into innerHTML, which was an XSS sink. It now
  // builds children via document.createElement + textContent. If someone
  // reverts to string-concatenated innerHTML this test fails immediately.
  it('never renders user-controlled filenames as parsed HTML', () => {
    const malicious = '<script>window.__pwned = true;</script><img src=x onerror=alert(1)>';
    const node = AttachmentFileBlot.create({
      attachment_identifier: 'abc-123',
      filename: malicious,
      filesize: 512,
    });

    expect(node.querySelector('script')).toBe(null);
    expect(node.querySelector('img')).toBe(null);
    const nameEl = node.querySelector('.quill-inline-attachment-file__name');
    expect(nameEl).not.toBe(null);
    expect(nameEl.textContent).toBe(malicious);
    expect(node.getAttribute('data-filename')).toBe(malicious);
    expect(node.getAttribute('download')).toBe(malicious);
  });

  it('round-trips identifier / filename / filesize through create → value', () => {
    const value = {
      attachment_identifier: 'id-xyz',
      filename: 'report.pdf',
      filesize: 2048,
    };
    const node = AttachmentFileBlot.create(value);
    expect(AttachmentFileBlot.value(node)).toEqual(value);
  });

  it('links via the identifier-fallback route and hints download for the filename', () => {
    const node = AttachmentFileBlot.create({
      attachment_identifier: 'abc def', // deliberately contains a space
      filename: 'x.pdf',
    });
    expect(node.getAttribute('href')).toBe('/api/v1/attachments/-1?identifier=abc%20def');
    expect(node.getAttribute('download')).toBe('x.pdf');
  });
});
