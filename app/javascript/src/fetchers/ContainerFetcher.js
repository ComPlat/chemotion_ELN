import ApiClient from 'src/api_clients/ChemotionApiClient';
import _ from 'lodash';

export default class ContainerFetcher {
  // Remove container id of unseletced attachemnts(the attachemnts not in Inbox)
  static deleteContainerLinkUnselected(params) {
    return ApiClient.patchJson('/api/v1/containers', {
      body: { container_id: params.id, attachments: params.attachments }
    });
  }

  static deleteContainer(container) {
    return ApiClient.deleteRequest(`/api/v1/containers/${container.id}`);
  }

  static updateContainerContent(container) {
    let content = _.cloneDeep(container.extended_metadata.content);
    if (typeof content === 'string') {
      content = JSON.parse(content);
    }

    return ApiClient.putJson(`/api/v1/containers/${container.id}`, { body: { container_id: container.id, content } });
  }

  static updateContainer(container) {
    return ApiClient.putJson('/api/v1/containers/container', { body: { container } });
  }
}
