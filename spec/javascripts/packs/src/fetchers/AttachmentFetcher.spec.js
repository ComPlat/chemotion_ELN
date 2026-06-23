import 'whatwg-fetch';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

describe('AttachmentFetcher.fetchAttachmentText', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('fetches the attachment by id and resolves with its raw text', async () => {
    fetchStub.resolves(new Response('{"Output":[]}'));

    const text = await AttachmentFetcher.fetchAttachmentText(42);

    sinon.assert.calledOnce(fetchStub);
    sinon.assert.calledWithExactly(fetchStub, '/api/v1/attachments/42', { credentials: 'same-origin' });
    expect(text).toEqual('{"Output":[]}');
  });

  it('rejects with a descriptive error on a non-ok response', async () => {
    fetchStub.resolves(new Response('nope', { status: 404 }));

    let caught;
    try {
      await AttachmentFetcher.fetchAttachmentText(42);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeTruthy();
    expect(caught.message).toContain('Failed to fetch attachment 42');
    expect(caught.message).toContain('404');
  });
});
