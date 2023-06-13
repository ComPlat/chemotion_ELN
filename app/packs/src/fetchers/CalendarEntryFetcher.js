import 'whatwg-fetch';
// eslint-disable-next-line no-unused-vars
import _ from 'lodash';

function isEmpty(value) {
  return (value === null || value === undefined);
}

function getAsUriParameters(data) {
  let url = '';
  Object.keys(data).forEach((key) => {
    if (!isEmpty(data[key])) {
      url += `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}&`;
    }
  });
  return url.substring(0, url.length - 1);
}

export default class CalendarEntryFetcher {
  static getEntries(params) {
    return fetch(`/api/v1/calendar_entries?${getAsUriParameters(params)}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => response.json()).then((json) => json.entries);
  }

  static getEventableUsers(params) {
    return fetch(`/api/v1/calendar_entries/eventable_users?${getAsUriParameters(params)}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => response.json()).then((json) => json.users);
  }

  static async deleteById(id) {
    return fetch(`/api/v1/calendar_entries/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => response.json());
  }

  static async create(params) {
    return fetch('/api/v1/calendar_entries', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json());
  }

  static async update(params) {
    return fetch(`/api/v1/calendar_entries/${params.id}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json());
  }
}
