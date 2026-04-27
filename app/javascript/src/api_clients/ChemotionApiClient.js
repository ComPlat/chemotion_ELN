// TODO: research if the following import can be safely removed
// import 'whatwg-fetch';

// default functions for 90% of use cases
const get_json = (api_endpoint, options = {}) => {
  const defaults = { method: 'GET' }
  
  return api_request(api_endpoint, { ...defaults, ...options })
}

const put_json = (api_endpoint, options) => {
  const defaults = { method: 'PUT' }

  if (typeof options.body != 'string') {
    options.body = JSON.stringify(options.body)
  }

  return api_request(api_endpoint, { ...defaults, ...options })
}

// this function assumes the body is already a form data object and does not try to typecast it
const put_form_data = (api_endpoint, options) => {
  const defaults = {
    method: 'PUT',
    headers: {
      'Accept': 'application/json' // lets see what omitting the content-type header does...
    }
  }

  return api_request(api_endpoint, { ...defaults, ...options })
}

const post_json = (api_endpoint, options) => {
  const defaults = { method: 'POST' }

  if (typeof options.body != 'string') {
    options.body = JSON.stringify(options.body)
  }

  return api_request(api_endpoint, { ...defaults, ...options })
}

// this function assumes the body is already a form data object and does not try to typecast it
const post_form_data = (api_endpoint, options) => {
  const defaults = {
    method: 'POST',
    headers: {
      'Accept': 'application/json' // lets see what omitting the content-type header does...
    }
  }

  return api_request(api_endpoint, { ...defaults, ...options })
}

const delete_request = (api_endpoint, options = {}) => {
  return api_request(api_endpoint, { method: 'DELETE', ...options })
}

// most low level request, which actually calls fetch
const api_request = (api_endpoint, options) => {
  const global_defaults = {
    credentials: 'same-origin',
    handle_response_success: (response) => { return response.json() },
    handle_response_error: (exception) => { console.log(exception) },
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  }

  options = { ...global_defaults, ...options }
  const { handle_response_success, handle_response_error } = options

  return fetch(api_endpoint, options)
          .then(handle_response_success)
          .catch(handle_response_error)
}

const ChemotionApiClient = {
  api_request,
  get_json,
  put_json,
  put_form_data,
  post_json,
  post_form_data,
  delete_request
}

export default ChemotionApiClient
