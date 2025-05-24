
import 'whatwg-fetch';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class PngFetcher {

  static fetchpng(params) {
    console.log(params)
    const promise = fetch(`/api/v1/prediction/png`,{
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
    }).then((response) => {
      return response.json();
    }).then((json) => {
      if (json.error) {
        NotificationActions.add.defer({
          message: json.error,
          level: 'error'
        });
      } else {
        NotificationActions.add.defer({
          message: 'Fetch Success!',
          level: 'success'
        });
      }
      
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}

