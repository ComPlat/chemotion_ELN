import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class PublicFetcher {
  static getAboutInfo() {
    return ApiClient.getJson('/api/v1/public/about');
  }
}
