import ApiClient from 'src/api_clients/ChemotionApiClient';
import { uniq } from 'lodash';

export default class DeviceFetcher {
  static fetchCurrentConnection(selected, isNotFocused) {
    const searchTerm = { id: selected.id, status: isNotFocused };
    return ApiClient.getJson(`/api/v1/devices/current_connection?${new URLSearchParams(searchTerm)}`, {
      handleResponseError: (exception) => {
        console.error('Error fetching connections:', exception);
        return { using: 0, watching: 0 };
      },
    })
      .then((json) => {
        let using = 0;
        let watching = 0;
        if (json.result && Array.isArray(json.result) && json.result.length > 0) {
          const data = uniq(json.result)
            .filter((line) => line && line.includes(','))
            .map((line) => line.split(','));
          const conn = Object.fromEntries(data);

          Object.keys(conn).forEach((k) => {
            if (conn[k] === '0') { using += 1; }
            if (conn[k] === '1') { watching += 1; }
          });
        }
        return { using, watching };
      });
  }
}
