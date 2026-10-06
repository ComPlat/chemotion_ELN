import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class GateFetcher {
  static transmittingByCollectionId(method, collectionId, reference) {
    const url = `/api/v1/gate/transmitting/${collectionId}`;
    const isPost = method.toUpperCase() === 'POST';
    const options = {
      handleResponseSuccess: (response) => response.json()
        .then((json) => {
          const newState = {
            overlayTarget: isPost ? null : reference,
            status: 'redirect',
            target: json?.target
          };

          if (response.status === 404) {
            newState.message = 'The access token is not set. Retrieve one now on chemotion.net?';
          } else if (response.status === 401) {
            if (json?.error && json?.error.match(/expired/)) {
              newState.message = 'The access token has expired. Renew it now on chemotion.net?';
            } else {
              newState.message = `The access token is misconfigured ('${json?.error}'). `
                 + 'Renew it now on chemotion.net?';
            }
          } else if (!response.ok) {
            newState.status = 'unavailable';
          } else if (isPost) {
            newState.status = 'queued';
          } else {
            newState.status = 'confirm';
          }
          return newState;
        }),
    };

    return isPost
      ? ApiClient.postJson(url, options)
      : ApiClient.getJson(url, options);
  }
}
