import ApiClient from 'src/api_clients/ChemotionApiClient';
import { Map } from 'immutable';

import ResearchPlan from 'src/models/ResearchPlan';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import Literature from 'src/models/Literature';

import { getFileName, downloadBlob } from 'src/utilities/FetcherHelper';

export default class ResearchPlansFetcher {
  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'research_plans', ResearchPlan);
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/research_plans/${id}`)
      .then((json) => this.researchPlanElement(json, id));
  }

  static create(researchPlan) {
    researchPlan.convertTemporaryImageFieldsInBody();

    const promise = () => ApiClient.postJson('/api/v1/research_plans', { body: researchPlan.serialize() })
      .then((json) => AttachmentFetcher.updateAttachables(
        researchPlan.getNewAttachments(),
        'ResearchPlan',
        json.research_plan.id,
        researchPlan.getMarkedAsDeletedAttachments()
      )()
        .then(() => GenericElsFetcher.uploadGenericFiles(researchPlan, json.research_plan.id, 'ResearchPlan', true)
          .then(() => this.researchPlanElement(json, json.research_plan.id))));

    return AttachmentFetcher.uploadNewAttachmentsForContainer(researchPlan.container).then(() => promise());
  }

  static update(researchPlan) {
    researchPlan.convertTemporaryImageFieldsInBody();

    const promise = () => ApiClient.putJson(
      `/api/v1/research_plans/${researchPlan.id}`,
      { body: researchPlan.serialize() }
    )
      .then((json) => AttachmentFetcher.updateAttachables(
        researchPlan.getNewAttachments(),
        'ResearchPlan',
        json.research_plan.id,
        researchPlan.getMarkedAsDeletedAttachments()
      )()
        .then(() => GenericElsFetcher.uploadGenericFiles(researchPlan, json.research_plan.id, 'ResearchPlan', true)
          .then(() => BaseFetcher.updateAnnotations(researchPlan))
          .then(() => this.researchPlanElement(json, json.research_plan.id))));

    return AttachmentFetcher.uploadNewAttachmentsForContainer(researchPlan.container).then(() => promise());
  }

  static updateSVGFile(svg_file, isChemdraw = false) {
    return ApiClient.postJson('/api/v1/research_plans/svg', { body: { svg_file, is_chemdraw: isChemdraw } });
  }

  static updateImageFile(imageFile, replace) {
    const data = new FormData();
    data.append('file', imageFile);
    if (replace) { data.append('replace', replace); }

    return ApiClient.postJson('/api/v1/research_plans/image', { body: data });
  }

  static export(researchPlan, exportFormat) {
    let fileName;
    return ApiClient.getJson(`/api/v1/research_plans/${researchPlan.id}/export/?export_format=${exportFormat}`, {
      handleResponseSuccess: (response) => {
        if (response.ok === false) {
          throw new Error(response);
        }
        fileName = getFileName(response);
        return response.blob();
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
        if (response.ok === false) {
          throw new Error(response.statusText);
        }
        fileName = getFileName(response);
        return response.blob();
      }
    })
      .then((blob) => {
        downloadBlob(fileName, blob);
      });
  }

  static fetchTableSchemas() {
    return ApiClient.getJson('/api/v1/research_plans/table_schemas', {
      handleResponseSuccess: (response) => {
        if (response.ok === false) {
          throw new Error(response.statusText);
        }
        return response.json();
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
}
