import ApiClient from 'src/api_clients/ChemotionApiClient';
import Wellplate from 'src/models/Wellplate';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class WellplatesFetcher {
  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'wellplates', Wellplate);
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/wellplates/${id}`)
      .then((json) => {
        const wellplate = new Wellplate(json.wellplate);
        wellplate.attachments = json.attachments;
        // eslint-disable-next-line no-underscore-dangle
        wellplate._checksum = wellplate.checksum();
        if (json.error) {
          return new Wellplate({
            id: `${id}:error:Wellplate ${id} is not accessible!`,
            wells: [],
            is_new: true,
          });
        }
        return wellplate;
      });
  }

  static bulkCreateWellplates(params) {
    return ApiClient.postJson('/api/v1/wellplates/bulk', { body: params });
  }

  static create(wellplate) {
    const files = (wellplate.attachments || []).filter((a) => a.is_new && !a.is_deleted);

    const promise = () => ApiClient.postJson('/api/v1/wellplates/', { body: wellplate.serialize() })
      .then((json) => {
        if (files.length <= 0) {
          return new Wellplate(json.wellplate);
        }
        return AttachmentFetcher.updateAttachables(files, 'Wellplate', json.wellplate.id, [])()
          .then(() => new Wellplate(json.wellplate));
      });

    return AttachmentFetcher.uploadNewAttachmentsForContainer(wellplate.container).then(() => promise());
  }

  static update(wellplate) {
    const newFiles = (wellplate.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (wellplate.attachments || []).filter((a) => !a.is_new && a.is_deleted);

    const promise = () => ApiClient.putJson(`/api/v1/wellplates/${wellplate.id}`, { body: wellplate.serialize() })
      .then((json) => new Wellplate(json.wellplate));

    const tasks = [];
    tasks.push(AttachmentFetcher.uploadNewAttachmentsForContainer(wellplate.container));

    if (newFiles.length > 0 || delFiles.length > 0) {
      tasks.push(AttachmentFetcher.updateAttachables(newFiles, 'Wellplate', wellplate.id, delFiles)());
    }
    return Promise.all(tasks)
      .then(() => BaseFetcher.updateAnnotations(wellplate))
      .then(() => promise());
  }

  static fetchWellplatesByUIState(params) {
    const body = {
      ui_state: {
        all: params.wellplate.all,
        included_ids: params.wellplate.included_ids,
        excluded_ids: params.wellplate.excluded_ids,
        collection_id: params.wellplate.collection_id,
      },
    };

    return ApiClient.postJson('/api/v1/wellplates/ui_state/', { body })
      .then((json) => json.wellplates.map((w) => new Wellplate(w)));
  }

  static splitAsSubwellplates(params) {
    const body = {
      ui_state: {
        wellplate: {
          all: params.wellplate.checkedAll,
          included_ids: params.wellplate.checkedIds,
          excluded_ids: params.wellplate.uncheckedIds,
        },
        currentCollectionId: params.currentCollection.id,
      },
    };

    return ApiClient.postJson('/api/v1/wellplates/subwellplates/', { body });
  }

  static importWellplateSpreadsheet(wellplateId, attachmentId) {
    const body = {
      wellplate_id: wellplateId,
      attachment_id: attachmentId,
    };

    return ApiClient.putJson(`/api/v1/wellplates/import_spreadsheet/${wellplateId}`, { body })
      .then((json) => {
        if (json.error) {
          let msg = 'Import to wellplate failed: ';
          msg += json.error;
          NotificationActions.add({
            message: msg,
            level: 'error',
          });
          return json;
        }
        NotificationActions.add({
          message: 'Import successful.',
          level: 'success',
        });
        const wellplate = new Wellplate(json.wellplate);
        wellplate.attachments = json.attachments;
        // eslint-disable-next-line no-underscore-dangle
        wellplate._checksum = wellplate.checksum();
        return wellplate;
      });
  }
}
