/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import { rootStore } from 'src/stores/mobx/RootStore';

class ContainerActions {
  updateContainerWithFiles(container) {
    return async () => {
      try {
        await AttachmentFetcher.uploadNewAttachmentsForContainer(container);
        const response = await ContainerFetcher.updateContainer(container);

        rootStore.notificationsStore.add({
          title: 'Analysis Updated.',
          message: 'Analysis has been updated.',
          level: 'success',
          position: 'tc'
        });
        return { container: response.container, variations: response.variations ?? null };
      } catch (error) {
        console.error('Failed to update Analysis', error);
        throw error;
      }
    };
  }
}

export default alt.createActions(ContainerActions);
