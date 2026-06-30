import UserLabelsFetcher from 'src/fetchers/UserLabelsFetcher';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

describe('UserLabelsFetcher.bulkUpdate', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({}), { status: 200 }));
  });

  afterEach(() => {
    fetchStub.restore();
  });

  it('forwards the snake_case ui_state and id arrays the caller and backend use', async () => {
    const uiState = { sample: { checkedIds: [1, 2] } };
    await UserLabelsFetcher.bulkUpdate({
      ui_state: uiState,
      add_label_ids: [3, 4],
      remove_label_ids: [5],
    });

    sinon.assert.calledOnce(fetchStub);
    const [url, options] = fetchStub.firstCall.args;
    expect(url).toEqual('/api/v1/user_labels/bulk');
    expect(options.method).toEqual('POST');
    // Regression guard: a camelCase destructure dropped ui_state and emptied the
    // arrays, so the body went out as { add_label_ids: [], remove_label_ids: [] }
    // and the endpoint 400'd on the missing required ui_state.
    expect(JSON.parse(options.body)).toEqual({
      ui_state: uiState,
      add_label_ids: [3, 4],
      remove_label_ids: [5],
    });
  });
});
