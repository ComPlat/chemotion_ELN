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
    return AttachmentFetcher.uploadNewAttachmentsForContainer(screen.container)
      .then(() => ApiClient.postJson('/api/v1/screens', { body: screen.serialize() }))
      .then((json) => {
        const { id } = json.screen;
        return GenericElsFetcher.uploadGenericFiles(screen, id, 'Screen')
          .then(() => this.screenElement(json, id));
      });
  }

  static update(screen) {
    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(screen.container),
      GenericElsFetcher.uploadGenericFiles(screen, screen.id, 'Screen'),
    ];

    return Promise.all(tasks)
      .then(() => BaseFetcher.updateAnnotationsInContainer(screen))
      .then(() => ApiClient.putJson(`/api/v1/screens/${screen.id}`, { body: screen.serialize() }))
      .then((json) => this.screenElement(json, screen.id));
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
