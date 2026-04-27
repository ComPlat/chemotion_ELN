import ApiClient from 'src/api_clients/ChemotionApiClient';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class InboxFetcher {
  static fetchInbox(isCntOnly = false, queryParams = {}) {
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};

    // if the user has not updated its profile yet, we set the default sort to name
    const searchTerm = {
      cnt_only: isCntOnly,
      page: queryParams.currentPage || 1,
      per_page: queryParams.itemsPerPage || 20,
      sort_column: filters.inbox?.sort || 'name'
    };

    return ApiClient.getJson(`/api/v1/inbox?${new URLSearchParams(searchTerm)}`);
  }

  static fetchInboxByContainer(containerId, currentContainerPage) {
    if (containerId < 0) { return Promise.resolve([]); }

    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};

    // if the user has not updated its profile yet, we set the default sort to name
    const searchTerm = { dataset_page: currentContainerPage || 1, sort_column: filters.inbox?.sort || 'name' };

    return ApiClient.getJson(`/api/v1/inbox/containers/${containerId}?${new URLSearchParams(searchTerm)}`);
  }

  static fetchInboxUnsorted() {
    return ApiClient.getJson('/api/v1/inbox/unlinked_attachments');
  }

  static fetchMatchingSamples(searchString) {
    return ApiClient.getJson(`/api/v1/inbox/samples?search_string=${searchString}`);
  }

  static fetchMatchingReactions(searchString) {
    return ApiClient.getJson(`/api/v1/inbox/reactions?search_string=${searchString}`);
  }

  static assignToSampleAnalysis(attachmentId, sampleId) {
    return ApiClient.postJson(`/api/v1/inbox/samples/${sampleId}`, { body: { attachment_id: attachmentId } });
  }

  static assignToReactionAnalysis(reactionId, attachmentId, variation) {
    return ApiClient.postJson(`/api/v1/inbox/reactions/${reactionId}`, {
      body: { attachment_id: attachmentId, variation }
    });
  }
}
