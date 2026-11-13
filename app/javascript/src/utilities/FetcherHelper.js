import base64 from 'base-64';
import {
  camelCase, snakeCase, upperFirst, isNil, omitBy
} from 'lodash';
import { dateToUnixTimestamp } from 'src/utilities/timezoneHelper';

const getFileName = (response) => {
  const disposition = response.headers.get('Content-Disposition');

  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }
  }
};

const downloadBlob = (fileName, blob) => {
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style = 'display: none';
  a.href = url;
  a.download = fileName;

  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
};

const parseBase64ToArrayBuffer = (encodedData) => {
  const decodedData = base64.decode(encodedData);
  const bufferLength = decodedData.length;
  const bytesArray = new Uint8Array(bufferLength);
  for (let i = 0; i < bufferLength; i++) {
    bytesArray[i] = decodedData.charCodeAt(i);
  }
  return bytesArray.buffer;
};

const transformKeys = (fn, obj) => {
  if (Array.isArray(obj)) return obj.map((item) => transformKeys(fn, item));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((newObj, key) => {
      // eslint-disable-next-line no-param-reassign
      newObj[fn(key)] = transformKeys(fn, obj[key]);
      return newObj;
    }, {});
  }
  return obj;
};

// replaces hump
const camelizeKeys = (obj) => transformKeys(camelCase, obj);
const decamelizeKeys = (obj) => transformKeys(snakeCase, obj);
// Mirrors transformKeys' tolerance of non-objects: a failed request resolves to
// undefined (handleResponseError swallows the exception), and Object.keys would
// then throw inside the fetcher's .then() as an unhandled rejection.
const shallowCamelizeKeys = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;

  return Object.keys(obj).reduce((newObj, key) => {
    newObj[camelCase(key)] = obj[key];
    return newObj;
  }, {});
};
const camelize = (str) => camelCase(str);
const decamelize = (str) => snakeCase(str);

// returns string: string_test => StringTest
const classifyString = (str) => upperFirst(camelCase(str));
// returns search params where params with nil or undefined values where removed
const filteredSearchParams = (params) => new URLSearchParams(omitBy(params, isNil));

const preparedCollectionParams = (id, params) => {
  // Re-inject the pagination defaults the removed BaseFetcher.fetchByCollectionId used to
  // supply, so callers passing {} (e.g. split-as-subsamples/subwellplates, vessel-template
  // mutations) still get the configured page size instead of the endpoints' small defaults.
  // Loaded at call-time (not a static import) to avoid a module-init import
  // cycle: FetcherHelper is pulled in by every fetcher, and UIStore transitively
  // imports those fetchers. Same pattern as VesselUtilities.js.
  const UIStore = require('src/stores/alt/stores/UIStore').default;
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? params?.per_page ?? UIStore.getState().number_of_results;
  const collectionParams = {
    ...params,
    page,
    per_page: perPage,
    collection_id: id,
    from_date: (params?.fromDate ? dateToUnixTimestamp(params.fromDate) : null),
    to_date: (params?.toDate ? dateToUnixTimestamp(params.toDate) : null)
  };
  return filteredSearchParams(decamelizeKeys(collectionParams));
};

export {
  getFileName, downloadBlob, parseBase64ToArrayBuffer, preparedCollectionParams,
  camelizeKeys, decamelizeKeys, shallowCamelizeKeys, camelize, decamelize, classifyString, filteredSearchParams
};
