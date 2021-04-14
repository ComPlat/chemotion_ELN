import 'whatwg-fetch';

export default class MessagesFetcher {
  static configuration() {
    return fetch('/api/v1/messages/config.json', {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchMessages(isAck) {
    return fetch(`/api/v1/messages/list.json?is_ack=${isAck}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchChannels(channelType) {
    return fetch(`/api/v1/messages/channels.json?channel_type=${channelType}`, {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static fetchChannelWithUser() {
    return fetch('/api/v1/messages/channels_user.json', {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static channelIndividualUsers() {
    return fetch('/api/v1/messages/channel_individual.json', {
      credentials: 'same-origin'
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static acknowledgedMessage(params) {
    return fetch('/api/v1/messages/ack/', {
      credentials: 'same-origin',
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static subscribeChannel(params) {
    return fetch('/api/v1/messages/subscribe/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  static createMessage(params) {
    return fetch('/api/v1/messages/new/', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }).then(response => response.json()).then(json => json).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }
}
