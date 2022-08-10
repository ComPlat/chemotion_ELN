import 'whatwg-fetch';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class ReportTemplateFetcher {

  static fetchTemplates() {
    let promise = fetch('/api/v1/report_templates/', {
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

  static fetchTemplateById(id) {
    let promise = fetch(`/api/v1/report_templates/${id}`, {
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

  static createTemplate(params) {
    const data = new FormData()
    data.append('name', params.name);
    data.append('report_type', params.report_type);
    if (params.attachment) {
      data.append('file', params.attachment);
    }
    return () => fetch('/api/v1/report_templates', {
      credentials: 'same-origin',
      method: 'post',
      body: data
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

  static updateTemplate(params) {
    const data = new FormData()
    data.append('id', params.id);
    data.append('name', params.name);
    data.append('report_type', params.report_type);
    data.append('attachment_id', params.attachment_id);
    if (params.attachment) {
      data.append('file', params.attachment);
    }
    return () => fetch(`/api/v1/report_templates/${params.id}`, {
      credentials: 'same-origin',
      method: 'put',
      body: data
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

  static deleteAttachment(params) {
    let promise = fetch(`/api/v1/report_templates/${params.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return new Attachment(json.attachment);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
