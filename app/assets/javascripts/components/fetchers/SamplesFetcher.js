import 'whatwg-fetch';
import Sample from '../models/Sample';
import SampleProxy from '../proxies/SampleProxy';

export default class SamplesFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/samples/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        console.log(json)
        return new SampleProxy(json.sample);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id, queryParams={}) {
    let page = queryParams.page || 1
    let api = id == 'all' ? `/api/v1/samples.json?page=${page}` : `/api/v1/samples.json?collection_id=${id}&page=${page}`
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.samples.map((s) => new SampleProxy(s)),
            totalElements: parseInt(response.headers.get('X-Total')),
            page: parseInt(response.headers.get('X-Page')),
            pages: parseInt(response.headers.get('X-Total-Pages')),
            perPage: parseInt(response.headers.get('X-Per-Page'))
          }
        })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static update(params) {
    let { density, boiling_point, melting_point } = params.molecule;
    let promise = fetch('/api/v1/samples/' + params.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: params.name,
        external_label: params.external_label,
        amount_value: params.amount_value,
        amount_unit: params.amount_unit,
        description: params.description,
        purity: params.purity,
        solvent: params.solvent,
        impurities: params.impurities,
        location: params.location,
        molfile: params.molfile,
        is_top_secret: params.is_top_secret,
        molecule: { density: density, boiling_point: boiling_point, melting_point: melting_point }
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new SampleProxy(json.sample);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static create(params) {
    let { density, boiling_point, melting_point } = params.molecule;
    let promise = fetch('/api/v1/samples', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: params.name,
        external_label: params.external_label,
        amount_value: params.amount_value,
        amount_unit: params.amount_unit,
        description: params.description,
        purity: params.purity,
        solvent: params.solvent,
        impurities: params.impurities,
        location: params.location,
        molfile: params.molfile,
        is_top_secret: params.is_top_secret,
        molecule: { density: density, boiling_point: boiling_point, melting_point: melting_point },
        collection_id: params.collection_id
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new SampleProxy(json.sample);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static deleteSamplesByUIState(params) {
    let promise = fetch('/api/v1/samples/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.sample.checkedAll,
          included_ids: params.sample.checkedIds,
          excluded_ids: params.sample.uncheckedIds
        }
      })
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static splitAsSubsamples(params) {
    let promise = fetch('/api/v1/samples/subsamples/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          sample: {
            all: params.sample.checkedAll,
            included_ids: params.sample.checkedIds,
            excluded_ids: params.sample.uncheckedIds
          },
          currentCollectionId: params.currentCollectionId
        }
      })
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
