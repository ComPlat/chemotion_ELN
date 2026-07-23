/* eslint-disable camelcase */
import SparkMD5 from 'spark-md5';

import ApiClient from 'src/api_clients/ChemotionApiClient';
import Attachment from 'src/models/Attachment';
import { decamelizeKeys, downloadBlob } from 'src/utilities/FetcherHelper';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { rootStore } from 'src/stores/mobx/RootStore';

const fileFromAttachment = (attachment, containerId) => {
  const { file } = attachment;
  file.id = attachment.id;
  file.attachable_id = containerId;
  file.attachable_type = 'Container';
  return file;
};

// NOTE: FetcherHelper.getFileName contains basically the same code but uses the full response object,
//       not only the dispositionHeader value
const extractFilenameFromContentDispositionHeader = (dispositionHeader) => {
  if (dispositionHeader != null) {
    if (dispositionHeader && dispositionHeader.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(dispositionHeader);
      if (matches != null && matches[1]) {
        return matches[1].replace(/['"]/g, '');
      }
    }
  }

  return null;
};

export default class AttachmentFetcher {
  static fetchImageAttachment(params) {
    const baseUrl = '/api/v1/attachments/image/';

    if (!(params.id || params.identifier)) {
      throw new Error('Either id or identifier must be provided.');
    }

    const idParameter = encodeURIComponent(params.id || '-1');
    const urlParams = params.id ? '' : new URLSearchParams({ identifier: params.identifier });

    const url = `${baseUrl}${idParameter}?${urlParams}`;

    const handleResponseSuccess = (response) => {
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return response.blob();
    };
    const handleResponseError = (error) => console.error('Failed to fetch image attachment:', error);
    const headers = {};

    return ApiClient.getJson(
      url,
      {
        handleResponseError,
        handleResponseSuccess,
        headers
      }
    ).then((blob) => ({ type: blob?.type, data: blob ? URL.createObjectURL(blob) : {} }));
  }

  static fetchThumbnail(params) {
    return ApiClient.getJson(`/api/v1/attachments/thumbnail/${params.id}`);
  }

  static fetchThumbnails(ids) {
    return ApiClient.postJson('/api/v1/attachments/thumbnails', { body: { ids } });
  }

  static fetchFiles(ids) {
    if (ids.length < 1) { return {}; }

    const handleResponseSuccess = (response) => {
      if (response.ok) {
        return response.json();
      }

      let msg = 'Fetching files failed: ';
      if (response.status === 401) {
        msg += 'You do not have permission to read the attachments!';
      } else {
        msg += response.statusText;
      }
      rootStore.notificationsStore.add({
        message: msg,
        level: 'error',
        position: 'tc',
        autoDismiss: 0,
      });
      return null;
    };

    return ApiClient.postJson('/api/v1/attachments/files', { body: { ids }, handleResponseSuccess });
  }

  static fetchJcamp(target) {
    const { file, mass, mol } = target;
    const data = new FormData();
    data.append('file', file);
    data.append('molfile', mol);
    data.append('mass', mass);

    return ApiClient.postFormData('/api/v1/chemspectra/file/convert', { body: data });
  }

  static updateAttachables(files, attachableType, attachableId, deletions) {
    const body = new FormData();
    files.forEach((file) => {
      body.append('attfilesIdentifier[]', file.id);
      body.append('files[]', file.file, file.name);
    });
    body.append('attachable_type', attachableType);
    body.append('attachable_id', attachableId);

    deletions.forEach((f) => {
      body.append('del_files[]', f.id);
    });

    const handleResponseSuccess = (response) => {
      if (response.ok === false) {
        let msg = 'Files uploading failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded.';
        } else {
          msg += response.statusText;
        }
        rootStore.notificationsStore.add({
          message: msg,
          level: 'error',
          position: 'tc',
        });
      }
    };

    return ApiClient.postFormData(
      '/api/v1/attachable/update_attachments_attachable',
      { body, handleResponseSuccess }
    );
  }

  static uploadToInbox(attachments) {
    const body = new FormData();
    const files = attachments
      .filter((f) => f.is_new)
      .map((f) => fileFromAttachment(f, null));

    files.forEach((file) => body.append(file.id || file.name, file));

    const handleResponseSuccess = (response) => {
      if (response.ok === false) {
        let msg = 'Files uploading to Inbox failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded.';
        } else {
          msg += response.statusText;
        }
        rootStore.notificationsStore.add({
          message: msg,
          level: 'error',
        });
      }
    };

    return ApiClient.postFormData('/api/v1/attachments/upload_to_inbox', { body, handleResponseSuccess });
  }

  // TODO: this function seems obsolete, delete?
  // static uploadFiles(files) {
  //   const data = new FormData();
  //   files.forEach((file) => {
  //     data.append(file.id || file.name, file);
  //   });

  //   return ApiClient.postFormData('/api/v1/attachments/upload_dataset_attachments', { body: data })
  //     .then((json) => {
  //       for (let i = 0; i < json.error_messages.length; i += 1) {
  //         rootStore.notificationsStore.add({
  //           message: json.error_messages[i],
  //           level: 'error',
  //         });
  //       }
  //     });
  // }

  static uploadCompleted(filename, key, checksum) {
    const handleResponseSuccess = (response) => {
      LoadingActions.stopLoadingWithProgress(filename);

      if (response.ok === false) {
        let msg = 'Files uploading failed: ';
        if (response.status === 413) {
          msg += 'File size limit exceeded.';
        } else {
          msg += response.statusText;
        }

        rootStore.notificationsStore.add({
          message: msg,
          level: 'error',
        });
      } else if (response.error_messages) {
        for (let i = 0; i < response.error_messages.length; i += 1) {
          rootStore.notificationsStore.add({
            message: response.error_messages[i],
            level: 'error',
          });
        }
      }
    };

    return ApiClient.postJson(
      '/api/v1/attachments/upload_chunk_complete',
      {
        body: { filename, key, checksum },
        handleResponseSuccess
      }
    );
  }

  static uploadChunk(chunk, counter, key, progress, filename) {
    const body = new FormData();

    body.append('file', chunk);
    body.append('counter', counter);
    body.append('key', key);

    const handleResponseSuccess = (response) => {
      LoadingActions.updateLoadingProgress(filename, progress);
      if (response.ok) return response.json();

      const msg = `Chunk uploading failed: ${response.statusText}`;
      rootStore.notificationsStore.add({
        message: msg,
        level: 'error',
      });
      return null;
    };

    return ApiClient.postFormData('/api/v1/attachments/upload_chunk', { body, handleResponseSuccess });
  }

  static getFileContent(file) {
    const promise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = new Uint8Array(event.target.result);
        resolve(buffer);
      };

      reader.readAsArrayBuffer(file);
    });

    return promise;
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
        this.uploadChunk(chunk, counter, key, counter / totalStep, file.name)
      );
      spark.append(await this.getFileContent(chunk));
      beginingOfTheChunk = endOfTheChunk;
      endOfTheChunk += chunkSize;
    }

    const checksum = spark.end();
    return Promise.all(tasks).then(() => this.uploadCompleted(file.name, key, checksum));
  }

  static deleteAttachment(params) {
    return ApiClient.deleteRequest(`/api/v1/attachments/${params.id}`)
      .then((json) => new Attachment(json.attachment));
  }

  static bulkDeleteAttachments(ids) {
    return ApiClient.deleteRequest('/api/v1/attachments/bulk_delete', { body: { ids } });
  }

  static deleteContainerLink(params) {
    return ApiClient.deleteRequest(`/api/v1/attachments/link/${params.id}`)
      .then((json) => new Attachment(json.attachment));
  }

  static downloadFile(url, fileNameFallback = 'dataset.zip') {
    let fileName;
    const handleResponseSuccess = (response) => {
      const dispositionHeader = response.headers.get('Content-Disposition');
      if (dispositionHeader == null) {
        rootStore.notificationsStore.notifyExImportStatus('Analysis download', 204);
        return null;
      }

      fileName = extractFilenameFromContentDispositionHeader(dispositionHeader) || fileNameFallback;
      return response.blob();
    };

    return ApiClient.apiRequest(url, { method: 'GET', handleResponseSuccess })
      .then((blob) => {
        if (blob && blob.type != null) { downloadBlob(fileName, blob); }
        return null;
      });
  }

  static downloadDataset(id) {
    return AttachmentFetcher.downloadFile(`/api/v1/export_ds/dataset/${id}`, 'dataset.xlsx');
  }

  static downloadZip(id) {
    return AttachmentFetcher.downloadFile(`/api/v1/attachments/zip/${id}`);
  }

  static downloadZipBySample(sampleId) {
    return AttachmentFetcher.downloadFile(`/api/v1/attachments/sample_analyses/${sampleId}`);
  }

  static downloadZipByDeviceDescription(deviceDescriptionId) {
    return AttachmentFetcher.downloadFile(`/api/v1/attachments/device_description_analyses/${deviceDescriptionId}`);
  }

  static downloadZipBySequenceBaseMacromoleculeSample(sequenceBasedMacromoleculeSampleId) {
    return AttachmentFetcher.downloadFile(
      `/api/v1/attachments/sequence_based_macromolecule_sample_analyses/${sequenceBasedMacromoleculeSampleId}`
    );
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
    lcmsMzPage,
    lcmsMzPageData
  ) {
    const params = {
      attachmentId: attId,
      peaksStr,
      shiftSelectX: shift?.peak?.x,
      shiftRefName: shift?.ref?.name,
      shiftRefValue: shift?.ref?.value,
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
      lcmsMzPage,
      lcmsMzPageData
    };

    const decamelized = decamelizeKeys(params);
    const hasLcmsMzPageData = decamelized.lcms_mz_page_data != null;

    const handleResponseSuccess = (response) => {
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
    };
    // ChemotionApiClient's default handleResponseError swallows the rejection; rethrow so
    // SpectraActions.SaveToFile's caller can see a failed save instead of a false success.
    const handleResponseError = (error) => { throw error; };

    let request;
    if (hasLcmsMzPageData) {
      const formData = new FormData();
      Object.keys(decamelized).forEach((key) => {
        const value = decamelized[key];
        if (value === undefined) return;
        if (key === 'lcms_mz_page_data') {
          const blob = new Blob([JSON.stringify(value)], { type: 'application/json' });
          formData.append(key, blob, 'lcms_mz_page_data.json');
        } else {
          const str = (value != null && typeof value === 'object') ? JSON.stringify(value) : value;
          formData.append(key, str != null ? String(str) : '');
        }
      });
      request = ApiClient.postFormData('/api/v1/attachments/save_spectrum/', {
        body: formData, handleResponseSuccess, handleResponseError,
      });
    } else {
      request = ApiClient.postJson('/api/v1/attachments/save_spectrum/', {
        body: decamelized, handleResponseSuccess, handleResponseError,
      });
    }

    return request
      .then((json) => {
        if (!isSaveCombined) return json;

        const oldSpcInfos = [...previousSpcInfos].filter((spc) => spc.idx !== attId);
        let jcampIds = oldSpcInfos.map((spc) => spc.idx);
        const fetchedFilesIdxs = json.files.map((file) => file.id);
        jcampIds = [...jcampIds, ...fetchedFilesIdxs];

        return AttachmentFetcher.combineSpectra(jcampIds, curveIdx, params)
          .then(() => json); // this appears to be intentional, I didn't change this from the original code
      });
  }

  static fetchLcmsPage({
    attachmentId, retentionTime, polarity, trigger, signal, timeoutMs = 30000,
  }) {
    const params = {
      attachmentId,
      retentionTime: retentionTime != null ? String(retentionTime) : '',
      polarity,
      trigger,
    };

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    const timeoutId = timeoutMs > 0
      ? setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), timeoutMs)
      : null;

    const handleResponseSuccess = async (response) => {
      if (!response.ok) {
        let payload = null;
        try { payload = await response.json(); } catch (_) { /* ignore */ }
        const err = new Error(payload?.error || `lcms_page ${response.status}`);
        err.status = response.status;
        err.code = payload?.code || `http_${response.status}`;
        throw err;
      }
      return response.json();
    };
    // Rethrow so an abort/timeout (or HTTP error) reaches the caller's .catch; the client's
    // default handleResponseError swallows it, which would leave the editor stuck in loading.
    const handleResponseError = (error) => { throw error; };

    return ApiClient.postJson('/api/v1/attachments/lcms_page/', {
      body: decamelizeKeys(params),
      signal: controller.signal,
      handleResponseSuccess,
      handleResponseError,
    })
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
      });
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

    return ApiClient.postJson('/api/v1/attachments/infer/', { body: decamelizeKeys(params) });
  }

  static regenerateSpectrum(jcampIds) {
    return ApiClient.postJson(
      '/api/v1/attachments/regenerate_spectrum/',
      { body: { original: jcampIds.orig, generated: jcampIds.gene } }
    );
  }

  // Re-runs the converter and its generic-dataset mapping for an already uploaded dataset
  // attachment, so a failed conversion can be retried without deleting and re-uploading.
  static reconvert(attachmentId) {
    // The endpoint replies 204 with no body; resolve a boolean so the caller can report
    // whether the re-run was accepted.
    return ApiClient.postJson(
      `/api/v1/attachments/${attachmentId}/reconvert`,
      { handleResponseSuccess: (response) => response.ok }
    );
  }

  static regenerateEditedSpectrum(jcampIds, molfile) {
    return ApiClient.postJson(
      '/api/v1/attachments/regenerate_edited_spectrum/',
      { body: { edited: jcampIds.edited, molfile } }
    );
  }

  static combineSpectra(jcampIds, curveIdx, extraParams = null) {
    const body = { spectra_ids: jcampIds, front_spectra_idx: curveIdx };
    if (extraParams != null) {
      body.extras = JSON.stringify(decamelizeKeys(extraParams));
    }
    return ApiClient.postJson(
      '/api/v1/chemspectra/file/combine_spectra',
      { body }
    );
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

  static getFileListfrom(container) {
    if (container == null) return [];

    const allFiles = [];
    this.filterAllAttachments(allFiles, container.children);
    return allFiles;
  }

  static async uploadNewAttachmentsForContainer(container) {
    const files = this.getFileListfrom(container);
    if (files.length > 0) {
      const tasks = files.map((file) => this.uploadFile(file));
      await Promise.all(tasks);
    }
  }
}
