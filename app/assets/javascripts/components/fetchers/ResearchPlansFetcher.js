import 'whatwg-fetch';
import ResearchPlan from '../models/ResearchPlan';
import _ from 'lodash';

export default class ResearchPlansFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/research_plans/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        return new ResearchPlan(json.research_plan);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id, queryParams={}, isSync = false) {
    let page = queryParams.page || 1;
    let per_page = queryParams.per_page || 7;
    let from_date = '';
    if (queryParams.fromDate) {
      from_date = `&from_date=${queryParams.fromDate.unix()}`
    }
    let to_date = '';
    if (queryParams.toDate) {
      to_date = `&to_date=${queryParams.toDate.unix()}`
    }
    let api = `/api/v1/research_plans.json?${isSync ? "sync_" : "" }` +
              `collection_id=${id}&page=${page}&per_page=${per_page}` +
              `${from_date}${to_date}`;
    let promise = fetch(api, {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json().then((json) => {
          return {
            elements:
              json.research_plans.map( s => new ResearchPlan(s) ),
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

  static update(research_plan) {
    let promise = fetch('/api/v1/research_plans/' + research_plan.id, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(research_plan.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new ResearchPlan(json.research_plan);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static updateSVGFile(svg_file) {
    let promise = ()=> fetch('/api/v1/research_plans/svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ svg_file: svg_file})
    }).then((response) => {
      return response.json()
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise();
  }

  static create(research_plan) {
    let promise = fetch('/api/v1/research_plans/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(research_plan.serialize())
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new ResearchPlan(json.research_plan);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static deleteResearchPlansByUIState(params) {
    let promise = fetch('/api/v1/research_plans/ui_state/', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.research_plan.checkedAll,
          collection_id: params.currentCollection.id,
          included_ids: params.research_plan.checkedIds,
          excluded_ids: params.research_plan.uncheckedIds
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
