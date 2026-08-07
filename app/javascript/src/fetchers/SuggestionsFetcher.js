import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class SuggestionsFetcher {
  static fetchSuggestionsForCurrentUser(elementType, query, collectId) {
    const urlParams = new URLSearchParams({ query: encodeURIComponent(query), collection_id: collectId });

    return ApiClient.getJson(`/api/v1/suggestions/${elementType.replaceAll(' ', '_')}?${urlParams}`)
      .then((json) => json.suggestions);
  }
}
