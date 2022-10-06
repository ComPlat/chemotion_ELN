import 'whatwg-fetch';
import Wellplate from 'src/models/Wellplate';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class WellplatesFetcher {
  static fetchById(id) {
    const promise = fetch(`/api/v1/wellplates/${id}.json`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json()).then((json) => {
        const rWellplate = new Wellplate(json.wellplate);
        rWellplate.attachments = json.attachments;
        // eslint-disable-next-line no-underscore-dangle
        rWellplate._checksum = rWellplate.checksum();
        if (json.error) {
          return new Wellplate({ id: `${id}:error:Wellplate ${id} is not accessible!`, wells: [], is_new: true });
        }
        return rWellplate;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static fetchByCollectionId(id, queryParams = {}, isShared = false) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, isShared, 'wellplates', Wellplate);
  }

  static bulkCreateWellplates(params) {
    const promise = fetch('/api/v1/wellplates/bulk', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static update(wellplate) {
    const containerFiles = AttachmentFetcher.getFileListfrom(wellplate.container);
    const newFiles = (wellplate.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (wellplate.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    const promise = () => fetch(`/api/v1/wellplates/${wellplate.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wellplate.serialize())
    }).then((response) => response.json()).then((json) => {
      if (newFiles.length <= 0 && delFiles.length <= 0) {
        return;
      }
      return AttachmentFetcher.updateAttachables(newFiles, 'Wellplate', json.wellplate.id, delFiles)();
    })
      .then(() => BaseFetcher.updateAnnotationsInContainer(wellplate))
      .then(() => WellplatesFetcher.fetchById(wellplate.id))
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static create(wellplate) {
    const containerFiles = AttachmentFetcher.getFileListfrom(wellplate.container);
    const files = (wellplate.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    const promise = () => fetch('/api/v1/wellplates/', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wellplate.serialize())
    }).then((response) => response.json()).then((json) => {
      if (files.length <= 0) {
        return new Wellplate(json.wellplate);
      }
      return AttachmentFetcher.updateAttachables(files, 'Wellplate', json.wellplate.id, [])()
        .then(() => new Wellplate(json.wellplate));
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    if (containerFiles.length > 0) {
      const tasks = [];
      containerFiles.forEach((file) => tasks.push(AttachmentFetcher.uploadFile(file).then()));
      return Promise.all(tasks).then(() => promise());
    }
    return promise();
  }

  static fetchWellplatesByUIState(params) {
    return fetch('/api/v1/wellplates/ui_state/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          all: params.wellplate.all,
          included_ids: params.wellplate.included_ids,
          excluded_ids: params.wellplate.excluded_ids,
          collection_id: params.wellplate.collection_id
        }
      })
    }).then((response) => response.json()).then((json) => json.wellplates.map((w) => new Wellplate(w))).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static splitAsSubwellplates(params) {
    const promise = fetch('/api/v1/wellplates/subwellplates/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ui_state: {
          wellplate: {
            all: params.wellplate.checkedAll,
            included_ids: params.wellplate.checkedIds,
            excluded_ids: params.wellplate.uncheckedIds
          },
          currentCollectionId: params.currentCollection.id
        }
      })
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static updateWellLabel(params) {
    const promise = fetch('/api/v1/wellplates/well_label', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static updateWellColorCode(params) {
    const promise = fetch('/api/v1/wellplates/well_color_code', {
      credentials: 'same-origin',
      method: 'post',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then((response) => response.json()).then((json) => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
    return promise;
  }

  static importWellplateSpreadsheet(wellplateId, attachmentId) {
    const promise = fetch(`/api/v1/wellplates/import_spreadsheet/${wellplateId}`, {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        wellplate_id: wellplateId,
        attachment_id: attachmentId
      })
    }).then((response) => response.json())
      .then((json) => {
        if (json.error) {
          let msg = 'Import to wellplate failed: ';
          msg += json.error;
          NotificationActions.add({
            message: msg,
            level: 'error'
          });
          return json;
        }
        NotificationActions.add({
          message: 'Import successful.',
          level: 'success'
        });
        const rWellplate = new Wellplate(json.wellplate);
        rWellplate.attachments = json.attachments;
        // eslint-disable-next-line no-underscore-dangle
        rWellplate._checksum = rWellplate.checksum();
        return rWellplate;
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
}
