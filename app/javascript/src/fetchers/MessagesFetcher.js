import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class MessagesFetcher {
  static configuration() {
    return ApiClient.getJson('/api/v1/messages/config');
  }

  static fetchMessages(isAck) {
    return ApiClient.getJson(`/api/v1/messages/list?is_ack=${isAck}`);
  }

  static fetchSpectraMessages(isAck) {
    return ApiClient.getJson(`/api/v1/messages/spectra?is_ack=${isAck}`);
  }

  static fetchChannels(channelType) {
    return ApiClient.getJson(`/api/v1/messages/channels?channel_type=${channelType}`);
  }

  static fetchChannelWithUser() {
    return ApiClient.getJson('/api/v1/messages/channels_user');
  }

  static channelIndividualUsers() {
    return ApiClient.getJson('/api/v1/messages/channel_individual');
  }

  static acknowledgedMessage(params) {
    return ApiClient.putJson('/api/v1/messages/ack', { body: params });
  }

  static subscribeChannel(params) {
    return ApiClient.postJson('/api/v1/messages/subscribe', { body: params });
  }

  static createMessage(params) {
    return ApiClient.postJson('/api/v1/messages/new', { body: params });
  }
}
