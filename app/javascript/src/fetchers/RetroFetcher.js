
import 'whatwg-fetch';
import { rootStore } from 'src/stores/mobx/RootStore';

export default class RetroFetcher {

  static fetchprecursors(params) {
    console.log(params)
    const promise = fetch(`/api/v1/prediction/retro`,{
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
        rootStore.notificationsStore.add({
          message: json.error,
          level: 'error'
        });
      } else {
        rootStore.notificationsStore.add({
          message: 'RetroSythesis prediction successful!',
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

