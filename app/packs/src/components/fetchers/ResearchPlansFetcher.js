import 'whatwg-fetch';
import _ from 'lodash';
import ResearchPlan from '../models/ResearchPlan';
import AttachmentFetcher from './AttachmentFetcher';
import BaseFetcher from './BaseFetcher';
import GenericElsFetcher from './GenericElsFetcher';

import { getFileName, downloadBlob } from '../utils/FetcherHelper'

export default class ResearchPlansFetcher {
  static fetchById(id) {
    let promise = fetch('/api/v1/research_plans/' + id + '.json', {
        credentials: 'same-origin'
      })
      .then((response) => {
        return response.json()
      }).then((json) => {
        const rResearchPlan = new ResearchPlan(json.research_plan);
        rResearchPlan.attachments = json.attachments;
        if (json.error) {
          rResearchPlan.id = `${id}:error:ResearchPlan ${id} is not accessible!`;
        }
        return rResearchPlan;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchByCollectionId(id, queryParams={}, isSync = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isSync, 'research_plans', ResearchPlan);
  }

  static create(researchPlan) {
    const promise = fetch('/api/v1/research_plans/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(researchPlan.serialize())
    }).then(response => response.json()).then(json => GenericElsFetcher.uploadGenericFiles(researchPlan, json.research_plan.id, 'ResearchPlan', true)
      .then(() => this.fetchById(json.research_plan.id))).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static update(researchPlan) {
    const containerFiles = AttachmentFetcher.getFileListfrom(researchPlan.container);
    const promise = () => fetch(`/api/v1/research_plans/${researchPlan.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(researchPlan.serialize())
    }).then(response => response.json()).then(json => GenericElsFetcher.uploadGenericFiles(researchPlan, json.research_plan.id, 'ResearchPlan', true)
      .then(() => this.fetchById(json.research_plan.id))).catch((errorMessage) => {
      console.log(errorMessage);
    });
    
    if (containerFiles.length > 0) {
      let tasks = [];
      containerFiles.forEach(file => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => {
        return promise();
      });
    }
    return promise();
  }

  static updateSVGFile(svg_file, isChemdraw = false) {
    let promise = ()=> fetch('/api/v1/research_plans/svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ svg_file: svg_file, is_chemdraw: isChemdraw })
    }).then((response) => {
      return response.json()
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise();
  }

  static updateImageFile(image_file, replace) {
    var data = new FormData();
    data.append('file', image_file);

    if (replace) {
      data.append('replace', replace);
    }

    let promise = ()=> fetch('/api/v1/research_plans/image', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      return response.json()
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise();
  }

  static export(researchPlan, exportFormat) {
    let file_name
    const promise = fetch(`/api/v1/research_plans/${researchPlan.id}/export/?export_format=${exportFormat}`, {
      credentials: 'same-origin',
      method: 'get',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        file_name = getFileName(response)
        return response.blob()
      } else {
        console.log(response);
      }
    }).then((blob) => {
      downloadBlob(file_name, blob)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static exportTable(researchPlan, field) {
    let file_name
    const promise = fetch(`/api/v1/research_plans/${researchPlan.id}/export_table/${field.id}/`, {
      credentials: 'same-origin',
      method: 'get',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        file_name = getFileName(response)
        return response.blob()
      } else {
        throw Error(response.statusText);
      }
    }).then((blob) => {
      downloadBlob(file_name, blob)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static fetchTableSchemas() {
    return fetch('/api/v1/research_plans/table_schemas/', {
      credentials: 'same-origin',
      method: 'get',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        return response.json()
      } else {
        throw Error(response.statusText);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static createTableSchema(name, value) {
    return fetch('/api/v1/research_plans/table_schemas/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, value })
    }).then(response => {
      return response.json()
    }).catch((errorMessage) => {
      console.log(errorMessage)
    })
  }

  static deleteTableSchema(id) {
    return fetch('/api/v1/research_plans/table_schemas/' + id, {
      credentials: 'same-origin',
      method: 'delete',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => {
      return response.json()
    }).catch((errorMessage) => {
      console.log(errorMessage)
    })
  }

  static postResearchPlanMetadata(params) {
    return fetch('/api/v1/research_plan_metadata', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
