import 'whatwg-fetch';
import _ from 'lodash';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

export default class ReportsFetcher {
  static fetchArchives() {
    let promise = fetch('/api/v1/archives/all', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchDownloadable(ids) {
    let promise = fetch('/api/v1/archives/downloadable/', {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ids: ids}),
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return json;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchContent(ids) {
    let promise = fetch(`/api/v1/reports/content?ids=${JSON.stringify(ids)}`, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        const samples = json.samples.map(s => new Sample(s));
        const reactions = json.reactions.map(r => new Reaction(r));
        return { samples, reactions };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static create(report) {
    let promise = fetch('/api/v1/reports', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report),
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
