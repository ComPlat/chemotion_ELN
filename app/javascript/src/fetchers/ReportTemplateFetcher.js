import ApiClient from 'src/api_clients/ChemotionApiClient';
import { rootStore } from 'src/stores/mobx/RootStore';

export default class ReportTemplateFetcher {
  static fetchTemplates() {
    return ApiClient.getJson('/api/v1/report_templates');
  }

  static fetchTemplateById(id) {
    return ApiClient.getJson(`/api/v1/report_templates/${id}`);
  }

  static createTemplate(params) {
    const data = new FormData();
    data.append('name', params.name);
    data.append('report_type', params.report_type);
    if (params.attachment) {
      data.append('file', params.attachment);
    }

    return ApiClient.postFormData('/api/v1/report_templates', {
      body: data,
      handleResponseSuccess: (response) => {
        if (response.ok === false) {
          let msg = 'Files uploading failed: ';
          if (response.status === 413) {
            msg += 'File size limit exceeded.';
          } else {
            msg += response.statusText;
          }
          rootStore.notificationsStore.add({
            message: msg,
            level: 'error'
          });
        }
        return response;
      }
    });
  }

  static updateTemplate(params) {
    const data = new FormData();
    data.append('id', params.id);
    data.append('name', params.name);
    data.append('report_type', params.report_type);
    data.append('attachment_id', params.attachment_id);
    if (params.attachment) {
      data.append('file', params.attachment);
    }

    return ApiClient.putFormData(`/api/v1/report_templates/${params.id}`, {
      body: data,
      handleResponseSuccess: (response) => {
        if (response.ok == false) {
          let msg = 'Files uploading failed: ';
          if (response.status == 413) {
            msg += 'File size limit exceeded.';
          } else {
            msg += response.statusText;
          }
          rootStore.notificationsStore.add({
            message: msg,
            level: 'error'
          });
          return response;
        }
      }
    });
  }

  static deleteAttachment(params) {
    return ApiClient.deleteRequest(`/api/v1/report_templates/${params.id}`)
      .then((json) => new Attachment(json.attachment));
  }
}
