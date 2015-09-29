import 'whatwg-fetch';

// TODO: SamplesFetcher also updates Samples and so on...naming?
export default class SamplesFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/samples/' + id + '.json', {
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

  static fetchByCollectionId(id, queryParams={}) {
    let page = queryParams.page || 1
    let api = id == 'all' ? `/api/v1/samples.json?page=${page}` : `/api/v1/samples.json?collection_id=${id}&page=${page}`
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements: json.samples,
            totalElements: response.headers.get('X-Total'),
            page: response.headers.get('X-Page'),
            pages: response.headers.get('X-Total-Pages')
          }
        })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static update(paramObj) {
    let { density, boiling_point, melting_point } = paramObj.molecule;
    let promise = fetch('/api/v1/samples/' + paramObj.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: paramObj.name,
        amount_value: paramObj.amount_value,
        amount_unit: paramObj.amount_unit,
        description: paramObj.description,
        purity: paramObj.purity,
        solvent: paramObj.solvent,
        impurities: paramObj.impurities,
        location: paramObj.location,
        molfile: paramObj.molfile,
        is_top_secret: paramObj.is_top_secret,
        molecule: { density: density, boiling_point: boiling_point, melting_point: melting_point }
      })
    })

    return promise;
  }

  static create(paramObj) {
    let { density, boiling_point, melting_point } = paramObj.molecule;
    let promise = fetch('/api/v1/samples', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: paramObj.name,
        amount_value: paramObj.amount_value,
        amount_unit: paramObj.amount_unit,
        description: paramObj.description,
        purity: paramObj.purity,
        solvent: paramObj.solvent,
        impurities: paramObj.impurities,
        location: paramObj.location,
        molfile: paramObj.molfile,
        is_top_secret: paramObj.is_top_secret,
        molecule: { density: density, boiling_point: boiling_point, melting_point: melting_point },
        collection_id: paramObj.collection_id
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

  static deleteSamplesByUIState(paramObj) {
    let promise = fetch('/api/v1/samples/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: paramObj.sample.checkedAll,
          included_ids: paramObj.sample.checkedIds,
          excluded_ids: paramObj.sample.uncheckedIds
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
