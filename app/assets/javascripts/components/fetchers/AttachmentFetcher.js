import 'whatwg-fetch';
import { camelizeKeys, decamelizeKeys } from 'humps';

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

  static fetchImageAttachment(params) {
    const promise = fetch(`/api/v1/attachments/image/${params.id}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.blob();
    }).then((blob) => {
      return URL.createObjectURL(blob);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

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

  static fetchFiles(ids) {
    let promise = fetch('/api/v1/attachments/files/', {
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

  static fetchJcamp(target) {
    const { file, mass, mol } = target;
    const data = new FormData();
    data.append('file', file);
    data.append('molfile', mol);
    data.append('mass', mass);

    let promise = fetch('/api/v1/chemspectra/file/convert', {
      credentials: 'same-origin',
      method: 'POST',
      body: data,
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

  static updateAttachables(files, attachableType, attachableId, dels) {
    const data = new FormData();
    files.forEach((file) => {
      data.append('files[]', file.file, file.name);
    });
    data.append('attachable_type', attachableType);
    data.append('attachable_id', attachableId);
    dels.forEach((f) => {
      data.append('del_files[]', f.id);
    });
    return () => fetch('/api/v1/attachable/update_attachments_attachable', {
      credentials: 'same-origin',
      method: 'post',
      body: data
    }).then((response) => {
      if (response.ok === false) {
        let msg = 'Files uploading failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded.';
        } else {
          msg += response.statusText;
        }
        NotificationActions.add({
          message: msg,
          level: 'error',
          position: 'tc'
        });
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
          msg += 'File size limit exceeded.';
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
    const data = new FormData()
    files.forEach((file) => {
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

  static saveSpectrum(attId, peaksStr, shift, scan, thres, integration, multiplicity, predict, keepPred) {
    const params = {
      attachmentId: attId,
      peaksStr,
      shiftSelectX: shift.peak.x,
      shiftRefName: shift.ref.name,
      shiftRefValue: shift.ref.value,
      scan,
      thres,
      integration,
      multiplicity,
      predict,
      keepPred,
    };

    const promise = fetch(
      '/api/v1/attachments/save_spectrum/',
      {
        credentials: 'same-origin',
        method: 'POST',
        headers:
          {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(decamelizeKeys(params)),
      },
    )
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static inferSpectrum(attId, peaksStr, shift, scan, thres, integration, multiplicity, predict, peaks, layout, keepPred) {
    const params = {
      attachmentId: attId,
      peaksStr,
      shiftSelectX: shift.peak.x,
      shiftRefName: shift.ref.name,
      shiftRefValue: shift.ref.value,
      scan,
      thres,
      integration,
      multiplicity,
      predict,
      keepPred,
      peaks: JSON.stringify(peaks),
      shift: JSON.stringify(shift),
      layout,
    };

    const promise = fetch(
      '/api/v1/attachments/infer/',
      {
        credentials: 'same-origin',
        method: 'POST',
        headers:
          {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(decamelizeKeys(params)),
      },
    )
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static regenerateSpectrum(jcampIds) {
    const promise = fetch(
      '/api/v1/attachments/regenerate_spectrum/',
      {
        credentials: 'same-origin',
        method: 'POST',
        headers:
          {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          original: jcampIds.orig,
          generated: jcampIds.gene,
        }),
      },
    )
      .then(response => response.json())
      .then(json => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
