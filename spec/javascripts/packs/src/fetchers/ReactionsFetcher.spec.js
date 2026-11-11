import expect from 'expect';
import sinon from 'sinon';
import { describe, it, afterEach } from 'mocha';
import toast from 'react-hot-toast';

// Initialize Component before the fetcher/store cycle re-enters Sample.
import 'src/models/Component';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import alt from 'src/stores/alt/alt';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

describe('reaction save validation failures', () => {
  afterEach(() => sinon.restore());

  ['create', 'update'].forEach((method) => {
    it(`keeps the editor intact and displays the server message on ${method}`, async () => {
      const message = 'Environment temperature must be a decimal number';
      const reaction = {
        id: 42,
        name: 'unsaved edits',
        container: {},
        products: [],
        serialize: () => ({ name: 'unsaved edits' }),
      };
      const fetch = sinon.stub(global, 'fetch').resolves(new Response(JSON.stringify({ error: message }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }));
      sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
      sinon.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
      sinon.stub(ReactionsFetcher, 'updateAnnotationsInReaction').resolves();
      const notification = sinon.stub(toast, 'error');
      const dispatch = sinon.spy(alt, 'dispatch');
      const stopLoading = sinon.stub(LoadingActions, 'stop');

      await ElementActions[`${method}Reaction`](reaction, true);

      expect(fetch.calledOnce).toBe(true);
      expect(notification.calledOnce).toBe(true);
      expect(notification.firstCall.args[0]).toBe(message);
      expect(dispatch.called).toBe(false);
      expect(reaction.name).toBe('unsaved edits');
      expect(stopLoading.calledOnce).toBe(true);
    });
  });
});
