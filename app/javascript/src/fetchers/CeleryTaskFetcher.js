
import 'whatwg-fetch';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class CeleryTaskFetcher {

  static fetchtask(params) {
    const promise = fetch(`/api/v1/prediction/celery`,{
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
      } 
      
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}

