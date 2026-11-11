import expect from 'expect';
import sinon from 'sinon';
import UserStore from 'src/stores/mobx/UserStore';
import UsersFetcher from 'src/fetchers/UsersFetcher';

describe('UserStore#syncSession', () => {
  let fetchStub;
  let store;

  beforeEach(() => {
    localStorage.clear();
    fetchStub = sinon.stub(UsersFetcher, 'fetchCurrentUser');
  });

  afterEach(() => {
    fetchStub.restore();
    localStorage.clear();
  });

  const createStore = () => UserStore.create({});

  it('is not checked before the server was asked', () => {
    store = createStore();

    expect(store.sessionChecked).toBe(false);
  });

  it('takes the role from the server when a session exists but nothing was stored (OmniAuth login)', async () => {
    fetchStub.resolves({ user: { id: 7, name: 'Jane Doe', type: 'Person' } });
    store = createStore();
    expect(store.role).toEqual('Guest');

    await store.syncSession();

    expect(store.role).toEqual('Person');
    expect(localStorage.getItem('chemotion-role')).toEqual('Person');
    expect(store.currentUser.id).toEqual(7);
    expect(store.sessionChecked).toBe(true);
  });

  it('replaces a stored role that does not match the server', async () => {
    localStorage.setItem('chemotion-role', 'Person');
    fetchStub.resolves({ user: { id: 1, name: 'Admin', type: 'Admin' } });
    store = createStore();

    await store.syncSession();

    expect(store.role).toEqual('Admin');
  });

  it('falls back to Guest and drops the stored token when the session has expired', async () => {
    localStorage.setItem('chemotion-role', 'Person');
    localStorage.setItem('chemotion-auth-token', 'expired-token');
    fetchStub.resolves({ error: '401 Unauthorized' });
    store = createStore();

    await store.syncSession();

    expect(store.role).toEqual('Guest');
    expect(store.currentUser).toBe(null);
    expect(localStorage.getItem('chemotion-auth-token')).toBe(null);
    expect(store.sessionChecked).toBe(true);
  });

  it('keeps the stored role when the server could not be reached', async () => {
    localStorage.setItem('chemotion-role', 'Person');
    // ApiClient resolves with undefined after logging a network error
    fetchStub.resolves(undefined);
    store = createStore();

    await store.syncSession();

    expect(store.role).toEqual('Person');
    expect(store.sessionChecked).toBe(true);
  });
});
