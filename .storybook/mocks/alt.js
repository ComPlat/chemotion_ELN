/**
 * Minimal alt stub for Storybook.
 *
 * This mock supports both import styles used in the app:
 * - `import Alt from 'alt'; const alt = new Alt();`
 * - `import alt from 'src/stores/alt/alt'; alt.createActions(...)`
 *
 * alt 0.18.x uses constructor patterns incompatible with SWC's strict class
 * transforms. This stub replaces the runtime with safe no-ops so that stores
 * and actions can be imported in Storybook without booting the real alt stack.
 */

function noop() {}
noop.defer = noop;

function makeActionsProxy(ActionsClass) {
  const proxy = {};
  const proto = ActionsClass.prototype;

  Object.getOwnPropertyNames(proto).forEach((key) => {
    if (key !== 'constructor') {
      proxy[key] = noop;
      proxy[key].defer = noop;
    }
  });

  return proxy;
}

function makeStoreProxy(StoreClass) {
  let state = {};

  try {
    const raw = Object.create(StoreClass.prototype);
    if (typeof raw.getInitialState === 'function') {
      state = raw.getInitialState() || {};
    }
  } catch (_) {
    // Ignore – some stores rely on the full alt runtime during init.
  }

  return {
    listen: noop,
    unlisten: noop,
    getState: () => state,
  };
}

function AltStub() {
  return this;
}

AltStub.prototype.createActions = function createActions(ActionsClass) {
  return makeActionsProxy(ActionsClass);
};

AltStub.prototype.createStore = function createStore(StoreClass) {
  return makeStoreProxy(StoreClass);
};

AltStub.prototype.dispatcher = { register: noop, dispatch: noop };

AltStub.createActions = function createActions(ActionsClass) {
  return makeActionsProxy(ActionsClass);
};

AltStub.createStore = function createStore(StoreClass) {
  return makeStoreProxy(StoreClass);
};

AltStub.dispatcher = { register: noop, dispatch: noop };

export default AltStub;
