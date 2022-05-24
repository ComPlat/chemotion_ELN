import 'whatwg-fetch';
import { camelizeKeys } from 'humps';

export const CALL_API = 'Call API';

const callApi = (endpoint, options = {}) => (
  fetch(endpoint, options).then((response) => {
    if (!response.ok) return Promise.reject(response);

    const contentType = response.headers.get('content-type');
    const jsonType = contentType.indexOf('application/json') !== -1;

    if (jsonType) {
      return response.json().then(json => camelizeKeys(json));
    }

    return response;
  })
);

export default store => next => (action) => {
  const api = action[CALL_API];
  if (typeof api === 'undefined') {
    return next(action);
  }

  const { endpoint, options } = api;
  let { normalizer } = api;
  if (typeof endpoint !== 'string') {
    throw new Error('Specify a string endpoint URL.');
  }
  if (!normalizer) normalizer = res => res;

  return callApi(endpoint, options).then(response => next({
    response: normalizer(response, store, action.type),
    ...action
  }));
};
