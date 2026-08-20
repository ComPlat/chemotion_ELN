/* eslint-disable no-undef */
import expect from 'expect';
import sinon from 'sinon';
import { copyToClipboard } from 'src/utilities/clipboard';

describe('copyToClipboard', () => {
  let originalExecCommand;
  let originalIsSecureContext;

  beforeEach(() => {
    originalExecCommand = document.execCommand;
    originalIsSecureContext = window.isSecureContext;
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
    window.isSecureContext = originalIsSecureContext;
    delete navigator.clipboard;
    // remove any textarea leaked by a failing test
    document.querySelectorAll('textarea').forEach((ta) => ta.remove());
  });

  describe('secure context with navigator.clipboard', () => {
    it('writes the text via the async clipboard API and resolves true', async () => {
      window.isSecureContext = true;
      const writeText = sinon.stub().resolves();
      navigator.clipboard = { writeText };
      document.execCommand = sinon.spy();

      const result = await copyToClipboard('hello world');

      expect(writeText.calledOnceWith('hello world')).toBe(true);
      expect(result).toBe(true);
      // the legacy path must not run when the async API succeeds
      expect(document.execCommand.called).toBe(false);
    });

    it('falls back to execCommand when writeText rejects', async () => {
      window.isSecureContext = true;
      navigator.clipboard = { writeText: sinon.stub().rejects(new Error('denied')) };
      document.execCommand = sinon.stub().returns(true);

      const result = await copyToClipboard('after rejection');

      expect(document.execCommand.calledWith('copy')).toBe(true);
      expect(result).toBe(true);
    });
  });

  describe('non-secure context (no navigator.clipboard)', () => {
    it('copies through the legacy textarea/execCommand path and resolves true', async () => {
      window.isSecureContext = false;
      const execCommand = sinon.stub().returns(true);
      document.execCommand = execCommand;

      const result = await copyToClipboard('legacy text');

      expect(execCommand.calledOnceWith('copy')).toBe(true);
      expect(result).toBe(true);
      // the temporary textarea is cleaned up
      expect(document.querySelectorAll('textarea').length).toBe(0);
    });

    it('resolves false when the legacy copy command fails', async () => {
      window.isSecureContext = false;
      document.execCommand = sinon.stub().returns(false);

      const result = await copyToClipboard('unhappy path');

      expect(result).toBe(false);
      expect(document.querySelectorAll('textarea').length).toBe(0);
    });
  });
});
