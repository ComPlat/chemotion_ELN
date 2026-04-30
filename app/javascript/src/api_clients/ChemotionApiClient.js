// TODO: research if the following import can be safely removed
// import 'whatwg-fetch';

// default functions for 90% of use cases
const getJson = (apiEndpoint, options = {}) => {
  const defaults = { method: 'GET' }
  
  return apiRequest(apiEndpoint, { ...defaults, ...options })
}

const putJson = (apiEndpoint, options) => {
  const defaults = { method: 'PUT' }

  if (typeof options.body != 'string') {
    options.body = JSON.stringify(options.body)
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options })
}

// this function assumes the body is already a form data object and does not try to typecast it
const putFormData = (apiEndpoint, options) => {
  const defaults = {
    method: 'PUT',
    headers: {
      'Accept': 'application/json' // lets see what omitting the content-type header does...
    }
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options })
}

const postJson = (apiEndpoint, options) => {
  const defaults = { method: 'POST' }

  if (typeof options.body != 'string') {
    options.body = JSON.stringify(options.body)
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options })
}

// this function assumes the body is already a form data object and does not try to typecast it
const postFormData = (apiEndpoint, options) => {
  const defaults = {
    method: 'POST',
    headers: {
      'Accept': 'application/json' // lets see what omitting the content-type header does...
    }
  }

  return apiRequest(apiEndpoint, { ...defaults, ...options })
}

const deleteRequest = (apiEndpoint, options = {}) => {
  const defaults = { method: 'DELETE' }
  return apiRequest(apiEndpoint, { ...defaults, ...options })
}

// most low level request, which actually calls fetch
const apiRequest = (apiEndpoint, options) => {
  const globalDefaults = {
    credentials: 'same-origin',
    handleResponseSuccess: (response) => { return response.json() },
    handleResponseError: (exception) => { console.log(exception) },
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  }

  options = { ...globalDefaults, ...options }
  const { handleResponseSuccess, handleResponseError } = options

  return fetch(apiEndpoint, options)
          .then(handleResponseSuccess)
          .catch(handleResponseError)
}

const ChemotionApiClient = {
  apiRequest,
  getJson,
  putJson,
  putFormData,
  postJson,
  postFormData,
  deleteRequest
}

export default ChemotionApiClient
