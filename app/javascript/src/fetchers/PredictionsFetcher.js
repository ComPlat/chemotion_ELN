import ApiClient from 'src/api_clients/ChemotionApiClient';

import { rootStore } from 'src/stores/mobx/RootStore';

export default class PredictionsFetcher {
  static fetchInfer(smis, template) {
    const path = template === 'predictProducts' ? 'products' : 'reactants';
    return ApiClient.postJson(`/api/v1/prediction/${path}`, { body: smis })
      .then((json) => {
        if (json.error) {
          rootStore.notificationsStore.add({
            message: json.error,
            level: 'error'
          });
        } else {
          rootStore.notificationsStore.add({
            message: 'Prediction Success!',
            level: 'success'
          });
        }
        return json;
      });
  }
}
