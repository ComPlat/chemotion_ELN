import BaseFetcher from './BaseFetcher';

import NotificationActions from '../actions/NotificationActions';

export default class PartnerAppFetcher {
  static getPartnerApps(redire) {
    let promise = fetch(`/api/v1/partner_app`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }).then((response) => {
      return response.json();
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static deletePartnerApp(id) {
    let promise = fetch(`/api/v1/partner_app/${id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchPartnerAppById(id) {
    let promise = fetch(`/api/v1/partner_app/${id}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    }).then((response) => {
      return response.json();
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static createPartnerApp(params) {
    return () => fetch('/api/v1/partner_app', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    }).then((response) => {
      if (response.ok == false) {
        let msg = 'Files uploading failed: ';
        if (response.status == 413) {
          msg += 'File size limit exceeded.'
        } else {
          msg += response.statusText;
        }
        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
    })
  }

  static updatePartnerApp(params) {
    return () => fetch(`/api/v1/partner_app/${params.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    }).then((response) => {
      if (response.ok == false) {
        let msg = 'Files uploading failed: ';
        if (response.status == 413) {
          msg += 'File size limit exceeded.'
        } else {
          msg += response.statusText;
        }
        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
    })
  }
}
