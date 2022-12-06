import 'whatwg-fetch';
import _ from 'lodash';

function isEmpty(value){
  return (value === null || value === undefined);
}

function getAsUriParameters(data) {
  var url = '';
  for (var prop in data) {
    if(!isEmpty(data[prop]))
      url += encodeURIComponent(prop) + '=' + encodeURIComponent(data[prop]) + '&';
  }
  return url.substring(0, url.length - 1)
}

export default class CalendarEntryFetcher {
  static getEntries(params) {
    return fetch('/api/v1/calendar_entries?' + getAsUriParameters(params), {
        credentials: 'same-origin',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
    }).then(response => {
      return response.json()
    }).then((json) => {
      return json.entries;
    });
  }

  static getEventableUsers(params) {
    return fetch('/api/v1/calendar_entries/eventable_users?' + getAsUriParameters(params), {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => {
      return response.json()
    }).then((json) => {
      return json.users;
    });
  }

  static async deleteById(id) {
    return fetch(`/api/v1/calendar_entries/${id}`, {
        credentials: 'same-origin',
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
    }).then(response => response.json());
  }

  static async create(params) {
    return fetch(`/api/v1/calendar_entries`, {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    }).then(response => response.json());
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
    }).then(response => response.json());
  }
}
