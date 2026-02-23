/* eslint-disable camelcase */
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
    let url = '/api/v1/attachments/image/';

    if (params.id) {
      url += encodeURIComponent(params.id);
    } else if (params.identifier) {
      const urlParams = new URLSearchParams({ identifier: params.identifier });
      url += `-1?${urlParams}`;
    } else {
      throw new Error('Either id or identifier must be provided.');
    }

    return fetch(url, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => ({
        type: blob.type,
        data: URL.createObjectURL(blob),
      }))
      .catch((error) => {
        console.error('Failed to fetch image attachment:', error);
      });
  }

  static fetchThumbnail(params) {
    const promise = fetch(`/api/v1/attachments/thumbnail/${params.id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchThumbnails(ids) {
    const promise = fetch('/api/v1/attachments/thumbnails/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchFiles(ids) {
    const promise = fetch('/api/v1/attachments/files/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    })
      .then((response) => {
        if (response.ok === false) {
          let msg = 'Fetching files failed: ';
          if (response.status === 401) {
            msg += 'You do not have permission to read the attachments!';
          } else {
            msg += response.statusText;
          }
          NotificationActions.add({
            message: msg,
            level: 'error',
            position: 'tc',
            autoDismiss: 0,
          });
        }
        return response.json();
      }).then((json) => json);

    return promise;
  }

  static fetchJcamp(target) {
    const { file, mass, mol } = target;
    const data = new FormData();
    data.append('file', file);
    data.append('molfile', mol);
    data.append('mass', mass);

    const promise = fetch('/api/v1/chemspectra/file/convert', {
      credentials: 'same-origin',
      method: 'POST',
      body: data,
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
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
    containers.forEach((container) => {
      const tmpArray = (container.attachments || [])
        .filter((a) => a.is_new && !a.is_deleted)
        .map((a) => fileFromAttachment(a, container.id));
      files.push(...tmpArray);

      if (container.children && container.children.length > 0) {
        this.filterAllAttachments(files, container.children);
      }
    });
  }

  static updateAttachables(files, attachableType, attachableId, dels) {
    const data = new FormData();
    files.forEach((file) => {
      data.append('attfilesIdentifier[]', file.id);
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
      body: data,
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
          position: 'tc',
        });
      }
    });
  }

  static uploadToInbox(attachments) {
    const data = new FormData();
    const files = attachments
      .filter((f) => f.is_new)
      .map((f) => fileFromAttachment(f, null));
    files.forEach((file) => {
      data.append(file.id || file.name, file);
    });
    return () => fetch('/api/v1/attachments/upload_to_inbox', {
      credentials: 'same-origin',
      method: 'post',
      body: data,
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
          level: 'error',
        });
      }
    });
  }

  static uploadFiles(files) {
    const data = new FormData();
    files.forEach((file) => {
      data.append(file.id || file.name, file);
    });
    return () => fetch('/api/v1/attachments/upload_dataset_attachments', {
      credentials: 'same-origin',
      contentType: 'application/json',
      method: 'post',
      body: data,
    })
      .then((response) => response.json())
      .then((json) => {
        for (let i = 0; i < json.error_messages.length; i += 1) {
          NotificationActions.add({
            message: json.error_messages[i],
            level: 'error',
          });
        }
      });
  }

  static uploadCompleted(filename, key, checksum) {
    return () => fetch('/api/v1/attachments/upload_chunk_complete', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        key,
        checksum,
      }),
    })
      .then((response) => response.json())
      .then((response) => {
        LoadingActions.stopLoadingWithProgress(filename);
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
          });
        } else if (response.error_messages) {
          for (let i = 0; i < response.error_messages.length; i += 1) {
            NotificationActions.add({
              message: response.error_messages[i],
              level: 'error',
            });
          }
        }
      });
  }

  static uploadChunk(chunk, counter, key, progress, filename) {
    const body = { file: chunk, counter, key };
    const formData = new FormData();
    Object.keys(body).forEach((name) => {
      formData.append(name, body[name]);
    });
    return () => fetch('/api/v1/attachments/upload_chunk', {
      credentials: 'same-origin',
      method: 'post',
      body: formData,
    })
      .then((response) => response.json())
      .then((response) => {
        LoadingActions.updateLoadingProgress(filename, progress);
        if (response.ok === false) {
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
    const chunksCount = file.size % chunkSize === 0
      ? file.size / chunkSize
      : Math.floor(file.size / chunkSize) + 1;
    let beginingOfTheChunk = 0;
    let endOfTheChunk = chunkSize;
    const tasks = [];
    const key = file.id;
    const spark = new SparkMD5.ArrayBuffer();
    const totalStep = chunksCount + 1;
    for (let counter = 1; counter <= chunksCount; counter += 1) {
      const chunk = file.slice(beginingOfTheChunk, endOfTheChunk);
      tasks.push(
        this.uploadChunk(chunk, counter, key, counter / totalStep, file.name)()
      );
      spark.append(await this.getFileContent(chunk));
      beginingOfTheChunk = endOfTheChunk;
      endOfTheChunk += chunkSize;
    }

    const checksum = spark.end();
    return Promise.all(tasks).then(() => this.uploadCompleted(file.name, key, checksum)());
  }

  static getFileContent(file) {
    const promise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const buffer = new Uint8Array(event.target.result);
        resolve(buffer);
      };

      reader.readAsArrayBuffer(file);
    });

    return promise;
  }

  static deleteAttachment(params) {
    const promise = fetch(`/api/v1/attachments/${params.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((json) => new Attachment(json.attachment))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static bulkDeleteAttachments(attachmentIdsToDelete) {
    const promise = fetch('/api/v1/attachments/bulk_delete', {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: attachmentIdsToDelete }),
    })
      .then((response) => response.json())
      .then((json) => ({
        deleted_attachments: json.deleted_attachments || [],
      }))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static deleteContainerLink(params) {
    const promise = fetch(`/api/v1/attachments/link/${params.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((json) => new Attachment(json.attachment))
      .catch((errorMessage) => {
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
      .then((response) => {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            file_name = matches[1].replace(/['"]/g, '');
          }
        }
        return response.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = file_name;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static downloadZip(id) {
    let file_name = 'dataset.zip';
    return fetch(`/api/v1/attachments/zip/${id}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => {
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            file_name = matches[1].replace(/['"]/g, '');
          }
        }
        return response.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = file_name;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static downloadZipBySample(sampleId) {
    let fileName = 'dataset.zip';
    return fetch(`/api/v1/attachments/sample_analyses/${sampleId}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => {
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
        }
        NotificationActions.notifyExImportStatus('Analysis download', 204);
        return null;
      })
      .then((blob) => {
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
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static downloadZipByDeviceDescription(deviceDescriptionId) {
    let fileName = 'dataset.zip';
    return fetch(`/api/v1/attachments/device_description_analyses/${deviceDescriptionId}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => {
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
        }
        NotificationActions.notifyExImportStatus('Analysis download', 204);
        return null;
      })
      .then((blob) => {
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
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  static downloadZipBySequenceBaseMacromoleculeSample(sequenceBasedMacromoleculeSampleId) {
    let fileName = 'dataset.zip';
    return fetch(`/api/v1/attachments/sequence_based_macromolecule_sample_analyses/${sequenceBasedMacromoleculeSampleId}`, {
      credentials: 'same-origin',
      method: 'GET',
    })
      .then((response) => {
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
        }
        NotificationActions.notifyExImportStatus('Analysis download', 204);
        return null;
      })
      .then((blob) => {
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
      .catch((errorMessage) => {
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
    simulatenmr,
    previousSpcInfos,
    isSaveCombined,
    axesUnitsStr,
    detector,
    dscMetaData,
    lcmsPeaksStr,
    lcmsIntegralsStr,
    lcmsUvvisWavelength,
    lcmsMzPage
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
      cyclicvolta,
      curveIdx,
      simulatenmr,
      axesUnits: axesUnitsStr,
      detector,
      dscMetaData,
      lcmsPeaksStr,
      lcmsIntegralsStr,
      lcmsUvvisWavelength,
      lcmsMzPage
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
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(`save_spectrum ${response.status}: ${text.slice(0, 200)}`);
          });
        }
        const contentType = response.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          return response.text().then((text) => {
            throw new Error(`save_spectrum: expected JSON, got ${contentType.slice(0, 50)} - ${text.slice(0, 200)}`);
          });
        }
        return response.json();
      })
      .then((json) => {
        if (!isSaveCombined) {
          return json;
        }
        const oldSpcInfos = [...previousSpcInfos].filter((spc) => spc.idx !== attId);
        let jcampIds = oldSpcInfos.map((spc) => (spc.idx));
        const fetchedFilesIdxs = json.files.map((file) => (file.id));
        jcampIds = [...jcampIds, ...fetchedFilesIdxs];

        return AttachmentFetcher.combineSpectra(jcampIds, curveIdx, params).then((res) => {
          return json;
        }).catch((errMsg) => {
          console.log(errMsg); // eslint-disable-line
        });
      })
      .catch((errorMessage) => {
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
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
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
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
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
        molfile,
      }),
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static combineSpectra(jcampIds, curveIdx, extraParams = null) {
    const extras = JSON.stringify(decamelizeKeys(extraParams))
    const promise = fetch(
      '/api/v1/chemspectra/file/combine_spectra',
      {
        credentials: 'same-origin',
        method: 'POST',
        headers:
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spectra_ids: jcampIds,
          front_spectra_idx: curveIdx,
          extras: extras,
        }),
      },
    )
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static async uploadNewAttachmentsForContainer(container) {
    const files = this.getFileListfrom(container);
    if (files.length > 0) {
      const tasks = files.map((file) => this.uploadFile(file));
      await Promise.all(tasks);
    }
  }
}
