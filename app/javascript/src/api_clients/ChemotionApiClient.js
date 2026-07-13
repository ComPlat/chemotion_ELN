/* eslint-disable no-param-reassign */
// TODO: research if the following import can be safely removed
// import 'whatwg-fetch';

// utility functions
const buildHeaders = (headers) => {
  const returnHeaders = new Headers();
  if (headers != null && headers !== undefined) {
    Object.keys(headers).forEach((header) => {
      returnHeaders.set(header, headers[header]);
    });
  }
  const authToken = localStorage.getItem('chemotion-auth-token');
  if (authToken) { returnHeaders.set('Authorization', authToken); }
  if (!returnHeaders.has('Accept')) { returnHeaders.set('Accept', 'application/json'); }
  if (!returnHeaders.has('Content-Type')) { returnHeaders.set('Content-Type', 'application/json'); }

  // for formData submission, content type header must not be set, so the browser can set it properly
  // see Warning at the end of section https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects#sending_files_using_a_formdata_object
  if (headers != null && headers['Content-Type'] === null) {
    returnHeaders.delete('Content-Type');
  }

  return returnHeaders;
};

/**
 * Low-level request wrapper shared by every verb helper; the only place that
 * actually calls `fetch`.
 *
 * Response handling is configurable through two option callbacks:
 *
 * - `handleResponseSuccess(response)` maps the resolved `Response` to the value
 *   the returned promise resolves with. The default parses the JSON body, except
 *   that a `204 No Content` resolves to `null` — a 204 has an empty body, so
 *   `response.json()` would reject with "Unexpected end of JSON input". Override
 *   it to operate on the raw `Response` instead; e.g. an endpoint that replies
 *   `204` on success and carries no body should pass
 *   `handleResponseSuccess: (response) => response.ok` to resolve a boolean
 *   (`response.ok` over `=== 204` so it survives a later success-status change).
 * - `handleResponseError(exception)` runs on a network/parse failure.
 *
 * @param {string} apiEndpoint - request URL
 * @param {object} options - `fetch` options, plus the two handlers above
 * @returns {Promise<*>} whatever `handleResponseSuccess` returns (JSON body by
 *   default; `null` on 204)
 */
const apiRequest = (apiEndpoint, options) => {
  const globalDefaults = {
    credentials: 'same-origin',
    handleResponseSuccess: (response) => (response.status === 204 ? null : response.json()),
    handleResponseError: (exception) => { console.log(exception); },
  };
  const headers = buildHeaders(options?.headers);

  options = { ...globalDefaults, ...options, headers };
  const { handleResponseSuccess, handleResponseError } = options;

  return fetch(apiEndpoint, options)
    .then(handleResponseSuccess)
    .catch(handleResponseError);
};

// default functions for 90% of use cases
const getJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'GET' };

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const putJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'PUT' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

// this function assumes the body is already a form data object and does not try to typecast it
const putFormData = (apiEndpoint, options) => {
  const defaults = {
    method: 'PUT',
    headers: {
      'Content-Type': null // assign null, so buildHeaders will not auto-assign this headerfield but clear it
    }
  };

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const postJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'POST' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

// this function assumes the body is already a form data object and does not try to typecast it
const postFormData = (apiEndpoint, options) => {
  const defaults = {
    method: 'POST',
    headers: {
      'Content-Type': null // assign null, so buildHeaders will not auto-assign this headerfield but clear it
    }
  };

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const patchJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'PATCH' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const deleteRequest = (apiEndpoint, options = {}) => {
  const defaults = { method: 'DELETE' };

  if (options.body != null && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options });
};

const ChemotionApiClient = {
  apiRequest,
  getJson,
  putJson,
  putFormData,
  postJson,
  postFormData,
  patchJson,
  deleteRequest
};

export default ChemotionApiClient;
