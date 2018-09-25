import 'whatwg-fetch';

export default class MessagesFetcher {
  static configuration() {
    const promise = fetch('/api/v1/messages/config.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static fetchMessages(isAck) {
    const promise = fetch(`/api/v1/messages/list.json?is_ack=${isAck}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static fetchChannels(channelType) {
    const promise = fetch(`/api/v1/messages/channels.json?channel_type=${channelType}`, {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static fetchChannelWithUser() {
    const promise = fetch('/api/v1/messages/channels_user.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static channelIndividualUsers() {
    const promise = fetch('/api/v1/messages/channel_individual.json', {
      credentials: 'same-origin'
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static acknowledgedMessage(params) {
    const promise = fetch('/api/v1/messages/ack/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
  static subscribeChannel(params) {
    const promise = fetch('/api/v1/messages/subscribe/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }

  static createMessage(params) {
    const promise = fetch('/api/v1/messages/new/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
      .then(response => response.json()).then(json => json).catch((errorMessage) => {
        console.log(errorMessage);
      });
    return promise;
  }
}
