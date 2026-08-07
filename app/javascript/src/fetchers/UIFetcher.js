import ApiClient from 'src/api_clients/ChemotionApiClient';
import { camelizeKeys } from 'src/utilities/FetcherHelper';

import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';

export default class UIFetcher {
  static initialize() {
    return ApiClient.getJson('/api/v1/ui/initialize')
      .then((json) => camelizeKeys(json));
  }

  static deleteElementsByUIState(params) {
    return ApiClient.deleteRequest('/api/v1/ui_state', { body: JSON.stringify(params) });
  }

  static loadReport(params, loadType) {
    const body = { ...params, loadType };
    return ApiClient.postJson('/api/v1/ui_state/load_report', { body })
      .then((json) => {
        const samples = json.samples.map((s) => new Sample(s));
        const reactions = json.reactions.map((r) => new Reaction(r));
        return { samples, reactions };
      });
  }

  static fetchNMRDisplayerHost() {
    return ApiClient.getJson('/api/v1/chemspectra/nmrium_wrapper/host_name');
  }
}
