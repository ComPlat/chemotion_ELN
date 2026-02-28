import UserStore from 'src/stores/alt/stores/UserStore';

export default class InboxFetcher {
  static fetchInbox(isCntOnly = false, queryParams = {}) {
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};
    const sortColumn = filters.inbox?.sort || 'name';

    // if the user has not updated its profile yet, we set the default sort to name
    const addQuery = `&sort_column=${filters.inbox ? sortColumn : 'name'}`;

    const promise = fetch(`/api/v1/inbox?cnt_only=${isCntOnly}&page=${queryParams.currentPage || 1}&per_page=${queryParams.itemsPerPage || 20}${addQuery}`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchInboxByContainer(containerId, currentContainerPage) {
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};
    const sortColumn = filters.inbox?.sort || 'name';

    // if the user has not updated its profile yet, we set the default sort to name
    const addQuery = `&sort_column=${filters.inbox ? sortColumn : 'name'}`;

    const promise = fetch(`/api/v1/inbox/containers/${containerId}?dataset_page=${currentContainerPage || 1}${addQuery}`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchInboxUnsorted() {
    const promise = fetch('/api/v1/inbox/unlinked_attachments', {
      credentials: 'same-origin'
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchMatchingSamples(searchString) {
    const promise = fetch(`/api/v1/inbox/samples?search_string=${searchString}`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static fetchMatchingReactions(searchString) {
    const promise = fetch(`/api/v1/inbox/reactions?search_string=${searchString}`, {
      credentials: 'same-origin'
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static assignToSampleAnalysis(attachmentId, sampleId) {
    const promise = fetch(`/api/v1/inbox/samples/${attachmentId}?attachment_id=${sampleId}`, {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }

  static assignToReactionAnalysis(reactionId, attachmentId, variation) {
    const promise = fetch(
      `/api/v1/inbox/reactions/${reactionId}?attachment_id=${attachmentId}&variation=${variation}`,
      {
        credentials: 'same-origin',
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )
      .then((response) => response.json())
      .then((json) => json)
      .catch((errorMessage) => {
        console.log(errorMessage);
      });

    return promise;
  }
}
