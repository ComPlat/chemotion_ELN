import ApiClient from 'src/api_clients/ChemotionApiClient';
import Screen from 'src/models/Screen';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

export default class ScreensFetcher {
  static fetchByCollectionId(id, queryParams = {}) {
    return BaseFetcher.fetchByCollectionId(id, queryParams, 'screens', Screen);
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/screens/${id}`)
      .then((json) => this.screenElement(json, id));
  }

  static create(screen) {
    const promise = () => ApiClient.postJson('/api/v1/screens', { body: screen.serialize() })
      .then((json) => GenericElsFetcher.uploadGenericFiles(screen, json.screen.id, 'Screen')
        .then(() => this.screenElement(json, json.screen.id)));

    return AttachmentFetcher.uploadNewAttachmentsForContainer(screen.container).then(() => promise());
  }

  static update(screen) {
    const promise = () => ApiClient.putJson(`/api/v1/screens/${screen.id}`, { body: screen.serialize() })
      .then((json) => GenericElsFetcher.uploadGenericFiles(screen, json.screen.id, 'Screen')
        .then(() => BaseFetcher.updateAnnotationsInContainer(screen))
        .then(() => this.screenElement(json, json.screen.id)));

    return AttachmentFetcher.uploadNewAttachmentsForContainer(screen.container).then(() => promise());
  }

  static addResearchPlan(screenId, collectionId) {
    return ApiClient.postJson(`/api/v1/screens/${screenId}/add_research_plan`, { body: collectionId });
  }

  static screenElement(json, id) {
    if (json.error) {
      return new Screen({ id: `${id}:error:Screen ${id} is not accessible!` });
    }
    return new Screen(json.screen);
  }
}
