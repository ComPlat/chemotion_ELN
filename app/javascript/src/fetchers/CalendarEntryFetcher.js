import ApiClient from 'src/api_clients/ChemotionApiClient';
import { filteredSearchParams } from 'src/utilities/FetcherHelper';

export default class CalendarEntryFetcher {
  static getEntries(params) {
    return ApiClient.getJson(`/api/v1/calendar_entries?${filteredSearchParams(params)}`)
      .then((json) => json.entries);
  }

  static getEventableUsers(params) {
    return ApiClient.getJson(`/api/v1/calendar_entries/eventable_users?${filteredSearchParams(params)}`)
      .then((json) => json.users);
  }

  static async deleteById(id) {
    return ApiClient.deleteRequest(`/api/v1/calendar_entries/${id}`);
  }

  static async create(params) {
    return ApiClient.postJson('/api/v1/calendar_entries', { body: params });
  }

  static async update(params) {
    return ApiClient.putJson(`/api/v1/calendar_entries/${params.id}`, { body: params });
  }
}
