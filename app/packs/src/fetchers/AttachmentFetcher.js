import 'whatwg-fetch';
import { decamelizeKeys } from 'humps';

import Attachment from 'src/models/Attachment';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import SparkMD5 from 'spark-md5';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

const fileFromAttachment = (attachment, containerId) => {
  const { file } = attachment;
  file.id = attachment.id;
  file.attachable_id = containerId;
  file.attachable_type = 'Container';
  return file;
};

export default class AttachmentFetcher {
  static fetchImageAttachment(params) {
    return fetch(`/api/v1/attachments/image/${params.id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => response.blob())
      .then(blob => ({ type: blob.type, data: URL.createObjectURL(blob) }))
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchImageAttachmentByIdentifier(params) {
    const urlParams = new URLSearchParams({
      identifier: params.identifier,
      annotated: params.annotated,
    });

    return fetch('/api/v1/attachments/image/-1?' + urlParams, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => response.blob())
      .then(blob => ({ type: blob.type, data: URL.createObjectURL(blob) }))
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static fetchThumbnail(params) {
    let promise = fetch(`/api/v1/attachments/thumbnail/${params.id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        return json;
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchThumbnails(ids) {
    let promise = fetch('/api/v1/attachments/thumbnails/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        return json;
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchFiles(ids) {
    let promise = fetch('/api/v1/attachments/files/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        return json;
      })
      .catch(errorMessage => {
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
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        return json;
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static getFileListfrom(container) {
    if (container == null) return [];
    const allFiles = [];
    this.filterAllAttachments(allFiles, container.children);
    return allFiles;
  }

  static filterAllAttachments(files, containers) {
    containers.forEach(container => {
      const tmpArray = (container.attachments || [])
        .filter(a => a.is_new)
        .map(a => fileFromAttachment(a, container.id));
      files.push.apply(files, tmpArray);

      if (container.children && container.children.length > 0) {
        this.filterAllAttachments(files, container.children);
      }
    });
  }

  static updateAttachables(files, attachableType, attachableId, dels) {
    const data = new FormData();
    files.forEach(file => {
      data.append('files[]', file.file, file.name);
    });
    data.append('attachable_type', attachableType);
    data.append('attachable_id', attachableId);
    dels.forEach(f => {
      data.append('del_files[]', f.id);
    });
    return () =>
      fetch('/api/v1/attachable/update_attachments_attachable', {
        credentials: 'same-origin',
        method: 'post',
        body: data,
      }).then(response => {
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
            position: 'tc',
          });
        }
      });
  }

  static uploadToInbox(attachments) {
    const data = new FormData();
    const files = attachments
      .filter(f => f.is_new)
      .map(f => fileFromAttachment(f, null));
    files.forEach(file => {
      data.append(file.id || file.name, file);
    });
    return () =>
      fetch('/api/v1/attachments/upload_to_inbox', {
        credentials: 'same-origin',
        method: 'post',
        body: data,
      }).then(response => {
        if (response.ok === false) {
          let msg = 'Files uploading to Inbox failed: ';
          if (response.status === 413) {
            msg += 'File size limit exceeded.';
          } else {
            msg += response.statusText;
          }
          NotificationActions.add({
            message: msg,
            level: 'error',
          });
        }
      });
  }

  static uploadFiles(files) {
    const data = new FormData();
    files.forEach(file => {
      data.append(file.id || file.name, file);
    });
    return () =>
      fetch('/api/v1/attachments/upload_dataset_attachments', {
        credentials: 'same-origin',
        contentType: 'application/json',
        method: 'post',
        body: data,
      })
        .then(response => {
          return response.json();
        })
        .then(json => {
          for (let i = 0; i < json.error_messages.length; i++) {
            NotificationActions.add({
              message: json.error_messages[i],
              level: 'error',
            });
          }
        });
  }

  static uploadCompleted(filename, key, checksum) {
    return () =>
      fetch('/api/v1/attachments/upload_chunk_complete', {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: filename,
          key: key,
          checksum: checksum,
        }),
      })
        .then(response => response.json())
        .then(response => {
          LoadingActions.stopLoadingWithProgress(filename);
          if (response.ok == false) {
            let msg = 'Files uploading failed: ';
            if (response.status == 413) {
              msg += 'File size limit exceeded.';
            } else {
              msg += response.statusText;
            }

            NotificationActions.add({
              message: msg,
              level: 'error',
            });
          } else if (response.error_messages) {
            for (let i = 0; i < response.error_messages.length; i++) {
              NotificationActions.add({
                message: response.error_messages[i],
                level: 'error',
              });
            }
          }
        });
  }

  static uploadChunk(chunk, counter, key, progress, filename) {
    let body = { file: chunk, counter: counter, key: key };
    const formData = new FormData();
    for (const name in body) {
      formData.append(name, body[name]);
    }
    return () =>
      fetch('/api/v1/attachments/upload_chunk', {
        credentials: 'same-origin',
        method: 'post',
        body: formData,
      })
        .then(response => response.json())
        .then(response => {
          LoadingActions.updateLoadingProgress(filename, progress);
          if (response.ok == false) {
            const msg = `Chunk uploading failed: ${response.statusText}`;
            NotificationActions.add({
              message: msg,
              level: 'error',
            });
          }
        });
  }

  static async uploadFile(file) {
    LoadingActions.startLoadingWithProgress(file.name);
    const chunkSize = 100 * 1024 * 1024;
    const chunksCount =
      file.size % chunkSize == 0
        ? file.size / chunkSize
        : Math.floor(file.size / chunkSize) + 1;
    let beginingOfTheChunk = 0;
    let endOfTheChunk = chunkSize;
    let tasks = [];
    const key = file.id;
    let spark = new SparkMD5.ArrayBuffer();
    let totalStep = chunksCount + 1;
    for (let counter = 1; counter <= chunksCount; counter++) {
      let chunk = file.slice(beginingOfTheChunk, endOfTheChunk);
      tasks.push(
        this.uploadChunk(chunk, counter, key, counter / totalStep, file.name)()
      );
      spark.append(await this.getFileContent(chunk));
      beginingOfTheChunk = endOfTheChunk;
      endOfTheChunk += chunkSize;
    }

    let checksum = spark.end();
    return Promise.all(tasks).then(() => {
      return this.uploadCompleted(file.name, key, checksum)();
    });
  }

  static getFileContent(file) {
    let promise = new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        let buffer = new Uint8Array(event.target.result);
        resolve(buffer);
      };

      reader.readAsArrayBuffer(file);
    });

    return promise;
  }

  static deleteAttachment(params) {
    let promise = fetch(`/api/v1/attachments/${params.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        return new Attachment(json.attachment);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static deleteContainerLink(params) {
    let promise = fetch(`/api/v1/attachments/link/${params.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        return response.json();
      })
      .then(json => {
        return new Attachment(json.attachment);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static downloadDataset(id) {
    let file_name = 'dataset.xlsx';
    return fetch(`/api/v1/export_ds/dataset/${id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          let matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            file_name = matches[1].replace(/['"]/g, '');
          }
        }
        return response.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        let url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = file_name;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static downloadZip(id) {
    let file_name = 'dataset.zip';
    return fetch(`/api/v1/attachments/zip/${id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          let filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          let matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            file_name = matches[1].replace(/['"]/g, '');
          }
        }
        return response.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        let url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = file_name;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static downloadZipBySample(sampleId) {
    let fileName = 'dataset.zip';
    return fetch(`/api/v1/attachments/sample_analyses/${sampleId}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then(response => {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition != null) {
          if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) {
              fileName = matches[1].replace(/['"]/g, '');
            }
          }

          return response.blob();
        } else {
          NotificationActions.notifyExImportStatus('Analysis download', 204);
          return null;
        }
      })
      .then(blob => {
        if (blob && blob.type != null) {
          const a = document.createElement('a');
          a.style = 'display: none';
          document.body.appendChild(a);
          const url = window.URL.createObjectURL(blob);
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  static saveSpectrum(
    attId,
    peaksStr,
    shift,
    scan,
    thres,
    integration,
    multiplicity,
    predict,
    keepPred,
    waveLengthStr,
    cyclicvolta,
    curveIdx,
    simulatenmr
  ) {
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
      waveLength: waveLengthStr,
      cyclicvolta: cyclicvolta,
      curveIdx: curveIdx,
      simulatenmr: simulatenmr,
    };

    const promise = fetch('/api/v1/attachments/save_spectrum/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(params)),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static inferSpectrum(
    attId,
    peaksStr,
    shift,
    scan,
    thres,
    integration,
    multiplicity,
    predict,
    peaks,
    layout,
    keepPred
  ) {
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

    const promise = fetch('/api/v1/attachments/infer/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(params)),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static regenerateSpectrum(jcampIds) {
    const promise = fetch('/api/v1/attachments/regenerate_spectrum/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original: jcampIds.orig,
        generated: jcampIds.gene,
      }),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }

  static regenerateEditedSpectrum(jcampIds, molfile) {
    const promise = fetch('/api/v1/attachments/regenerate_edited_spectrum/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        edited: jcampIds.edited,
        molfile: molfile,
      }),
    })
      .then(response => response.json())
      .then(json => json)
      .catch(errorMessage => {
        console.log(errorMessage);
      });

    return promise;
  }
}
