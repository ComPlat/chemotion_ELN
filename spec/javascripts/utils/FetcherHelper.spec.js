import expect from 'expect';
import base64 from 'base-64';

import {
  parseBase64ToArrayBuffer,
  preparedCollectionParams,
} from 'src/utilities/FetcherHelper';

// A value distinct from the endpoints' small defaults (7 / 5) and from the
// store's built-in default (15), so the assertions prove the value really
// comes from UIStore rather than any hard-coded fallback.
const CONFIGURED_PER_PAGE = 25;

// preparedCollectionParams reads UIStore.number_of_results via a call-time
// require('...').default (a deliberate lazy load that breaks a module-init
// import cycle). The real UIStore drags in a module graph that does not load
// under the plain mocha/babel runner, so we stub it in the require cache,
// keyed by the same resolved path FetcherHelper's require() will hit.
const uiStorePath = require.resolve('src/stores/alt/stores/UIStore');
require.cache[uiStorePath] = {
  id: uiStorePath,
  filename: uiStorePath,
  loaded: true,
  exports: { default: { getState: () => ({ number_of_results: CONFIGURED_PER_PAGE }) } },
};

describe('parseBase64ToArrayBuffer', () => {
  it('return array buffer', () => {
    const stringToTest = 'This is test';
    const originalByteArray = new TextEncoder().encode(stringToTest);
    const originalBuffer = originalByteArray.buffer;

    const encodedValue = base64.encode(stringToTest);
    const parsedBuffer = parseBase64ToArrayBuffer(encodedValue);
    expect(parsedBuffer).toEqual(originalBuffer);
  });
});

describe('preparedCollectionParams', () => {
  const collectionId = 42;

  it('injects page=1 and per_page from UIStore.number_of_results when params is empty', () => {
    const params = preparedCollectionParams(collectionId, {});
    expect(params.get('page')).toEqual('1');
    expect(params.get('per_page')).toEqual(String(CONFIGURED_PER_PAGE));
  });

  it('injects the same defaults when params is omitted entirely', () => {
    // The split-as-subwellplates flow calls the fetcher with no params object.
    const params = preparedCollectionParams(collectionId);
    expect(params.get('page')).toEqual('1');
    expect(params.get('per_page')).toEqual(String(CONFIGURED_PER_PAGE));
  });

  it('preserves an explicit snake_case per_page over the default', () => {
    const params = preparedCollectionParams(collectionId, { per_page: 5 });
    expect(params.get('per_page')).toEqual('5');
  });

  it('preserves an explicit camelCase perPage over the default', () => {
    const params = preparedCollectionParams(collectionId, { perPage: 7 });
    expect(params.get('per_page')).toEqual('7');
  });

  it('preserves an explicit page over the default', () => {
    const params = preparedCollectionParams(collectionId, { page: 3 });
    expect(params.get('page')).toEqual('3');
  });

  it('sets collection_id from the id argument', () => {
    const params = preparedCollectionParams(collectionId, {});
    expect(params.get('collection_id')).toEqual(String(collectionId));
  });
});
