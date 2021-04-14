import 'whatwg-fetch';
import _ from 'lodash';

export default class ContainerFetcher {
  // Remove container id of unseletced attachemnts(the attachemnts not in Inbox)
  static deleteContainerLinkUnselected(params) {
    const promise = fetch('/api/v1/containers/', {
      credentials: 'same-origin',
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        container_id: params.id,
        attachments: params.attachments
      })
    }).then(response => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static deleteContainer(container) {
    const promise = fetch(`/api/v1/containers/${container.id}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }

  static updateContainerContent(container) {
    let content = _.cloneDeep(container.extended_metadata.content);
    if (typeof content === 'string') {
      content = JSON.parse(content);
    }

    const promise = fetch(`/api/v1/containers/${container.id}`, {
      credentials: 'same-origin',
      method: 'put',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        container_id: container.id,
        content
      })
    }).then(response => response.json()).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}
