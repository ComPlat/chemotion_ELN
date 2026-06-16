import ApiClient from 'src/api_clients/ChemotionApiClient';
import { Map } from 'immutable';

import ResearchPlan from 'src/models/ResearchPlan';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import Literature from 'src/models/Literature';

import { getFileName, downloadBlob, preparedCollectionParams } from 'src/utilities/FetcherHelper';

export default class ResearchPlansFetcher {
  static fetchByCollectionId(id, params = {}) {
    return ApiClient.getJson(`/api/v1/research_plans?${preparedCollectionParams(id, params)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.research_plans.map((researchPlan) => (new ResearchPlan(researchPlan))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/research_plans/${id}`)
      .then((json) => this.researchPlanElement(json, id));
  }

  static create(researchPlan) {
    researchPlan.convertTemporaryImageFieldsInBody();

    return AttachmentFetcher.uploadNewAttachmentsForContainer(researchPlan.container)
      .then(() => ApiClient.postJson('/api/v1/research_plans', { body: researchPlan.serialize() }))
      .then((json) => {
        const { id } = json.research_plan;
        return this.researchPlanAttachments(researchPlan, id)
          .then(() => GenericElsFetcher.uploadGenericFiles(researchPlan, id, 'ResearchPlan', true))
          .then(() => this.researchPlanElement(json, id));
      });
  }

  static update(researchPlan) {
    researchPlan.convertTemporaryImageFieldsInBody();

    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(researchPlan.container),
      this.researchPlanAttachments(researchPlan, researchPlan.id),
    ];

    return Promise.all(tasks)
      .then(() => GenericElsFetcher.uploadGenericFiles(researchPlan, researchPlan.id, 'ResearchPlan', true))
      .then(() => AnnotationsFetcher.updateAnnotations(researchPlan))
      .then(() => ApiClient.putJson(`/api/v1/research_plans/${researchPlan.id}`, { body: researchPlan.serialize() }))
      .then((json) => this.researchPlanElement(json, researchPlan.id));
  }

  static updateSVGFile(svgFile, isChemdraw = false) {
    return ApiClient.postJson('/api/v1/research_plans/svg', {
      body: { svg_file: svgFile, is_chemdraw: isChemdraw }
    });
  }

  static updateImageFile(imageFile, replace) {
    const data = new FormData();
    data.append('file', imageFile);
    if (replace) { data.append('replace', replace); }

    return ApiClient.postFormData('/api/v1/research_plans/image', { body: data });
  }

  static export(researchPlan, exportFormat) {
    let fileName;
    return ApiClient.getJson(`/api/v1/research_plans/${researchPlan.id}/export/?export_format=${exportFormat}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) {
          fileName = getFileName(response);
          return response.blob();
        }
        throw new Error(response);
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }

  static exportTable(researchPlan, field) {
    let fileName;
    return ApiClient.getJson(`/api/v1/research_plans/${researchPlan.id}/export_table/${field.id}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) {
          fileName = getFileName(response);
          return response.blob();
        }
        throw new Error(response.statusText);
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }

  static fetchTableSchemas() {
    return ApiClient.getJson('/api/v1/research_plans/table_schemas', {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw new Error(response.statusText);
      }
    });
  }

  static createTableSchema(name, value) {
    return ApiClient.postJson('/api/v1/research_plans/table_schemas', { body: { name, value } });
  }

  static deleteTableSchema(id) {
    return ApiClient.deleteRequest(`/api/v1/research_plans/table_schemas/${id}`);
  }

  static postResearchPlanMetadata(params) {
    return ApiClient.postJson('/api/v1/research_plan_metadata', { body: params });
  }

  static importWellplate(id, wellplateId) {
    return ApiClient.postJson(`/api/v1/research_plans/${id}/import_wellplate/${wellplateId}`, { body: '{}' })
      .then((json) => this.researchPlanElement(json, json.research_plan.id));
  }

  static importTableFromSpreadsheet(id, attachmentId) {
    return ApiClient.postJson(`/api/v1/research_plans/${id}/import_table/${attachmentId}`, { body: '{}' })
      .then((json) => this.researchPlanElement(json, json.research_plan.id));
  }

  static fetchResearchPlansForElements(id, element) {
    return ApiClient.getJson(`/api/v1/research_plans/linked?${new URLSearchParams({ id, element })}`);
  }

  static researchPlanElement(json, id) {
    if (json.error) {
      return new ResearchPlan({ id: `${id}:error:ResearchPlan ${id} is not accessible!` });
    }
    const researchPlan = new ResearchPlan(json.research_plan);
    researchPlan.attachments = json.attachments;
    if (json.literatures && json.literatures.length > 0) {
      const tliteratures = json.literatures.map((literature) => new Literature(literature));
      const lits = tliteratures.reduce((acc, l) => acc.set(l.literal_id, l), new Map());
      researchPlan.literatures = lits;
      researchPlan.updateChecksum();
    }

    return researchPlan;
  }

  static researchPlanAttachments(researchPlan, id) {
    return AttachmentFetcher.updateAttachables(
      researchPlan.getNewAttachments(),
      'ResearchPlan',
      id,
      researchPlan.getMarkedAsDeletedAttachments()
    );
  }
}
