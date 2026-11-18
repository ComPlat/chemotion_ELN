import ApiClient from 'src/api_clients/ChemotionApiClient';
import Screen from 'src/models/Screen';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

export default class ScreensFetcher {
  static fetchByCollectionId(id, params = {}) {
    return ApiClient.getJson(`/api/v1/screens?${preparedCollectionParams(id, params)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.screens.map((screen) => (new Screen(screen))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
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
      .then(() => AnnotationsFetcher.updateAnnotationsInContainer(screen))
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
