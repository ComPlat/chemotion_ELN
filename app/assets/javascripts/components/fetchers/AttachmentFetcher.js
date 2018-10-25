import 'whatwg-fetch';
import Attachment from '../models/Attachment';
import NotificationActions from '../actions/NotificationActions';

const fileFromAttachment = (attachment, containerId) => {
  const { file } = attachment;
  file.id = attachment.id;
  file.attachable_id = containerId;
  file.attachable_type = 'Container';
  return file;
};

export default class AttachmentFetcher {

  static fetchThumbnail(params) {
    let promise = fetch(`/api/v1/attachments/thumbnail/${params.id}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static fetchThumbnails(ids) {
    let promise = fetch('/api/v1/attachments/thumbnails/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    }).then((response) => {
      return response.json();
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static getFileListfrom(container) {
    const allFiles = [];
    this.filterAllAttachments(allFiles, container.children);
    return allFiles
  }

  static filterAllAttachments(files, containers) {
    containers.forEach((container) => {
      const tmpArray = (container.attachments || []).filter(a => a.is_new)
        .map(a => fileFromAttachment(a, container.id));
      files.push.apply(files, tmpArray);

      if (container.children && container.children.length > 0) {
        this.filterAllAttachments(files, container.children);
      }
    });
  }

  static uploadToInbox(attachments) {
    const data = new FormData();
    const files = (attachments).filter(f => f.is_new)
      .map(f => fileFromAttachment(f, null));
    files.forEach((file) => {
      data.append(file.id || file.name, file);
    });
    return () => fetch('/api/v1/attachments/upload_to_inbox', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      if (response.ok === false) {
        let msg = 'Files uploading to Inbox failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded. Max size is 50MB';
        } else {
          msg += response.statusText;
        }
        NotificationActions.add({
          message: msg,
          level: 'error'
        });
      }
    });
  }

  static uploadFiles(files) {
    var data = new FormData()
    files.forEach((file)=> {
      data.append(file.id || file.name, file);
    });
    return ()=>fetch('/api/v1/attachments/upload_dataset_attachments', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      if(response.ok == false) {
        let msg = 'Files uploading failed: ';
        if(response.status == 413) {
          msg += 'File size limit exceeded. Max size is 50MB'
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

  static deleteAttachment(params){
    let promise = fetch(`/api/v1/attachments/${params.id}`, {
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

  static deleteContainerLink(params){
    let promise = fetch(`/api/v1/attachments/link/${params.id}`, {
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

  static downloadZip(id){
    let file_name = 'dataset.zip'
    return fetch(`/api/v1/attachments/zip/${id}`, {
      credentials: 'same-origin',
      method: 'GET',
    }).then((response) => {
      const disposition = response.headers.get('Content-Disposition')
      if (disposition && disposition.indexOf('attachment') !== -1) {
        let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        let matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          file_name = matches[1].replace(/['"]/g, '');
        }
      }
      return response.blob()
    }).then((blob) => {
      const a = document.createElement("a");
      a.style = "display: none";
      document.body.appendChild(a);
      let url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = file_name
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
}
