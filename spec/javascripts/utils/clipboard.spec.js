/* eslint-disable no-undef */
import expect from 'expect';
import sinon from 'sinon';
import toast from 'react-hot-toast';
import { copyToClipboard } from 'src/utilities/clipboard';

describe('copyToClipboard', () => {
  let originalExecCommand;
  let originalIsSecureContext;
  let toastErrorStub;
  let toastSuccessStub;

  beforeEach(() => {
    originalExecCommand = document.execCommand;
    originalIsSecureContext = window.isSecureContext;
    // copyToClipboard calls rootStore.notifications.add({ level: 'error', ... }), which
    // NotificationsStore routes to react-hot-toast's toast.error. The MST action itself
    // is protected and cannot be sinon-stubbed, so we assert at the toast seam it delegates to.
    toastErrorStub = sinon.stub(toast, 'error');
    toastSuccessStub = sinon.stub(toast, 'success');
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
    window.isSecureContext = originalIsSecureContext;
    toastErrorStub.restore();
    toastSuccessStub.restore();
    delete navigator.clipboard;
    // remove any textarea leaked by a failing test
    document.querySelectorAll('textarea').forEach((ta) => ta.remove());
  });

  describe('secure context with navigator.clipboard', () => {
    it('writes the text via the async clipboard API, resolves true and shows no toast', async () => {
      window.isSecureContext = true;
      const writeText = sinon.stub().resolves();
      navigator.clipboard = { writeText };
      document.execCommand = sinon.spy();

      const result = await copyToClipboard('hello world');

      expect(writeText.calledOnceWith('hello world')).toBe(true);
      expect(result).toBe(true);
      // the legacy path must not run when the async API succeeds
      expect(document.execCommand.called).toBe(false);
      // success stays silent (no toast on every copy)
      expect(toastErrorStub.called).toBe(false);
      expect(toastSuccessStub.called).toBe(false);
    });

    it('falls back to execCommand when writeText rejects', async () => {
      window.isSecureContext = true;
      navigator.clipboard = { writeText: sinon.stub().rejects(new Error('denied')) };
      document.execCommand = sinon.stub().returns(true);

      const result = await copyToClipboard('after rejection');

      expect(document.execCommand.calledWith('copy')).toBe(true);
      expect(result).toBe(true);
      expect(toastErrorStub.called).toBe(false);
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
      expect(toastErrorStub.called).toBe(false);
    });

    it('resolves false and shows an error toast when the legacy copy command fails', async () => {
      window.isSecureContext = false;
      document.execCommand = sinon.stub().returns(false);

      const result = await copyToClipboard('unhappy path');

      expect(result).toBe(false);
      expect(document.querySelectorAll('textarea').length).toBe(0);
      // the silent no-op now surfaces as a failure notification with the expected
      // message and dedupe uid (buildOptions maps uid -> options.id)
      expect(toastErrorStub.calledOnce).toBe(true);
      const [message, options] = toastErrorStub.firstCall.args;
      expect(message).toBe('Could not copy to the clipboard.');
      expect(options.id).toBe('copy-to-clipboard');
    });

    it('resolves false, cleans up and toasts when execCommand throws', async () => {
      window.isSecureContext = false;
      document.execCommand = sinon.stub().throws(new Error('execCommand blew up'));

      const result = await copyToClipboard('throwing exec');

      expect(result).toBe(false);
      // the temporary textarea is still removed via the finally block
      expect(document.querySelectorAll('textarea').length).toBe(0);
      expect(toastErrorStub.calledOnce).toBe(true);
    });

    it('resolves false (does not reject) and toasts when the DOM setup itself throws', async () => {
      window.isSecureContext = false;
      const createElement = sinon.stub(document, 'createElement').throws(new Error('no DOM'));

      try {
        // must resolve false rather than reject, so callers awaiting it never see a rejection
        const result = await copyToClipboard('no dom');
        expect(result).toBe(false);
        expect(toastErrorStub.calledOnce).toBe(true);
      } finally {
        createElement.restore();
      }
    });
  });
});
