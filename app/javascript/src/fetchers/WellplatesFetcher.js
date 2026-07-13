import ApiClient from 'src/api_clients/ChemotionApiClient';
import Wellplate from 'src/models/Wellplate';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

export default class WellplatesFetcher {
  static fetchByCollectionId(id, params = {}) {
    return ApiClient.getJson(`/api/v1/wellplates?${preparedCollectionParams(id, params)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.wellplates.map((wellplate) => (new Wellplate(wellplate))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/wellplates/${id}`)
      .then((json) => this.wellplateElement(json, id));
  }

  static bulkCreateWellplates(params) {
    return ApiClient.postJson('/api/v1/wellplates/bulk', { body: params });
  }

  static create(wellplate) {
    return AttachmentFetcher.uploadNewAttachmentsForContainer(wellplate.container)
      .then(() => ApiClient.postJson('/api/v1/wellplates', { body: wellplate.serialize() }))
      .then((json) => {
        const { id } = json.wellplate;
        return this.wellplateAttachments(wellplate, id)
          .then(() => this.wellplateElement(json, id));
      });
  }

  static update(wellplate) {
    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(wellplate.container),
      this.wellplateAttachments(wellplate, wellplate.id),
    ];

    return Promise.all(tasks)
      .then(() => AnnotationsFetcher.updateAnnotations(wellplate))
      .then(() => ApiClient.putJson(`/api/v1/wellplates/${wellplate.id}`, { body: wellplate.serialize() }))
      .then((json) => this.wellplateElement(json, wellplate.id));
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
        let msg = 'Import successful.';
        if (json.molarity_discarded) {
          msg += ' Molarity was discarded for wells without a sample assigned.';
        }
        NotificationActions.add({
          message: msg,
          level: json.molarity_discarded ? 'warning' : 'success',
        });
        return this.wellplateElement(json, wellplateId);
      });
  }

  static wellplateElement(json, id) {
    if (json.error) {
      return new Wellplate({ id: `${id}:error:Wellplate ${id} is not accessible!` });
    }
    const wellplate = new Wellplate(json.wellplate);
    wellplate.attachments = json.attachments;
    // eslint-disable-next-line no-underscore-dangle
    wellplate._checksum = wellplate.checksum();
    return wellplate;
  }

  static wellplateAttachments(wellplate, id) {
    const newFiles = (wellplate.attachments || []).filter((a) => a.is_new && !a.is_deleted);
    const delFiles = (wellplate.attachments || []).filter((a) => !a.is_new && a.is_deleted);
    if (newFiles.length === 0 && delFiles.length === 0) return Promise.resolve();
    return AttachmentFetcher.updateAttachables(newFiles, 'Wellplate', id, delFiles);
  }
}
