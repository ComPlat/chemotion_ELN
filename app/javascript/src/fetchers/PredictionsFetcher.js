import ApiClient from 'src/api_clients/ChemotionApiClient';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class PredictionsFetcher {
  static fetchInfer(smis, template) {
    const path = template === 'predictProducts' ? 'products' : 'reactants';
    return ApiClient.postJson(`/api/v1/prediction/${path}`, { body: smis })
      .then((json) => {
        if (json.error) {
          NotificationActions.add.defer({
            message: json.error,
            level: 'error'
          });
        } else {
          NotificationActions.add.defer({
            message: 'Prediction Success!',
            level: 'success'
          });
        }
        return json;
      });
  }
}
