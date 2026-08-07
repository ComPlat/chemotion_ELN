import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class CodeLogsFetcher {
  static fetchGenericCodeLogs(data) {
    return ApiClient.getJson(`/api/v1/code_logs/generic?code=${data}`)
      .then((json) => {
        if (json.error) {
          const error = new Error(json.error);
          error.response = json;
          throw error;
        } else {
          return json;
        }
      });
  }
}
