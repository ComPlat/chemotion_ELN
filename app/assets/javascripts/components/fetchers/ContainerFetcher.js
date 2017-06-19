import BaseFetcher from './BaseFetcher'
import Container from '../models/Container'

export default class ContainerFetcher {

  static deleteContainer(container){
    let promise = fetch(`/api/v1/containers/${container.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
