import 'whatwg-fetch';
import _ from 'lodash';
import ResearchPlan from 'src/models/ResearchPlan';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

import { getFileName, downloadBlob } from 'src/utilities/FetcherHelper';

export default class ResearchPlansFetcher {
  static fetchById(id) {
    const promise = fetch(`/api/v1/research_plans/${id}.json`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json()).then((json) => {
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

  static fetchByCollectionId(id, queryParams = {}, isShared = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isShared, 'research_plans', ResearchPlan);
  }

  static create(researchPlan) {
    researchPlan.convertTemporaryImageFieldsInBody();
    const promise = fetch('/api/v1/research_plans/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(researchPlan.serialize())
    }).then((response) => response.json()).then((json) => GenericElsFetcher.uploadGenericFiles(researchPlan, json.research_plan.id, 'ResearchPlan', true)
      .then(() => this.fetchById(json.research_plan.id))).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static update(researchPlan) {
    const containerFiles = AttachmentFetcher.getFileListfrom(researchPlan.container);
    researchPlan.convertTemporaryImageFieldsInBody();

    const promise = () => fetch(`/api/v1/research_plans/${researchPlan.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(researchPlan.serialize())
    }).then( response => response.json())
      .then((json) =>{ return GenericElsFetcher.uploadGenericFiles(researchPlan, json.research_plan.id, 'ResearchPlan', true)})
      .then(() => {
         return ResearchPlansFetcher.updateAnnotations(researchPlan) })
      .then(() =>{
        return this.fetchById(researchPlan.id)} )
      .catch((errorMessage) => {console.log(errorMessage);});

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static updateSVGFile(svg_file, isChemdraw = false) {
    const promise = () => fetch('/api/v1/research_plans/svg', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ svg_file, is_chemdraw: isChemdraw })
    }).then((response) => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise();
  }

  static updateImageFile(image_file, replace) {
    const data = new FormData();
    data.append('file', image_file);

    if (replace) {
      data.append('replace', replace);
    }

    const promise = () => fetch('/api/v1/research_plans/image', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise();
  }

  static export(researchPlan, exportFormat) {
    let file_name;
    const promise = fetch(`/api/v1/research_plans/${researchPlan.id}/export/?export_format=${exportFormat}`, {
      credentials: 'same-origin',
      method: 'get',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        file_name = getFileName(response);
        return response.blob();
      }
      console.log(response);
    }).then((blob) => {
      downloadBlob(file_name, blob);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static exportTable(researchPlan, field) {
    let file_name;
    const promise = fetch(`/api/v1/research_plans/${researchPlan.id}/export_table/${field.id}/`, {
      credentials: 'same-origin',
      method: 'get',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      if (response.ok) {
        file_name = getFileName(response);
        return response.blob();
      }
      throw Error(response.statusText);
    }).then((blob) => {
      downloadBlob(file_name, blob);
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
        return response.json();
      }
      throw Error(response.statusText);
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
    }).then((response) => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static deleteTableSchema(id) {
    return fetch(`/api/v1/research_plans/table_schemas/${id}`, {
      credentials: 'same-origin',
      method: 'delete',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });
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
    }).then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static importWellplate(id, wellplateId) {
    return fetch(
      `/api/v1/research_plans/${id}/import_wellplate/${wellplateId}`,
      {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: '{}'
      }
    ).then((response) => response.json())
      .then((json) => {
        const updatedResearchPlan = new ResearchPlan(json.research_plan);
        updatedResearchPlan._checksum = updatedResearchPlan.checksum();
        updatedResearchPlan.attachments = json.attachments;
        return updatedResearchPlan;
      }).catch((errorMessage) => { console.log(errorMessage); });
  }

  static importTableFromSpreadsheet(id, attachmentId) {
    return fetch(
      `/api/v1/research_plans/${id}/import_table/${attachmentId}`,
      {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: '{}'
      }
    ).then((response) => response.json())
      .then((json) => {
        const updatedResearchPlan = new ResearchPlan(json.research_plan);
        updatedResearchPlan._checksum = updatedResearchPlan.checksum();
        updatedResearchPlan.attachments = json.attachments;
        return updatedResearchPlan;
      }).catch((errorMessage) => { console.log(errorMessage); });
  }

  static updateAnnotations(researchPlan) {
    return Promise.all(
      [
      ResearchPlansFetcher.updateAnnotationsOfAttachments(researchPlan),
      BaseFetcher.updateAnnotationsInContainer(researchPlan,[])
    ]);        
  } 

  static updateAnnotationsOfAttachments(researchPlan){

    const updateTasks=[];
    researchPlan.attachments
      .filter((attach => attach.hasOwnProperty('updatedAnnotation')))
      .forEach(attach => {
        let data = new FormData();
        data.append('updated_svg_string', attach.updatedAnnotation);
        updateTasks.push(fetch('/api/v1/attachments/' + attach.id + '/annotation', {
          credentials: 'same-origin',
          method: 'post',
          body: data
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        }));
    })

    return Promise.all(updateTasks);
  }
}
