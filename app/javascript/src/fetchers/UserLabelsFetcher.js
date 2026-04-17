import 'whatwg-fetch';

export default class UserLabelsFetcher {
  static bulkUpdate({ ui_state, add_label_ids = [], remove_label_ids = [] }) {
    return fetch('/api/v1/user_labels/bulk', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ui_state,
        add_label_ids,
        remove_label_ids,
      }),
    })
      .then((response) => response)
      .catch((errorMessage) => { console.log(errorMessage); });
  }
}
