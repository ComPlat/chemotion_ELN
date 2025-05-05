/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

class ContainerActions {
  updateContainerWithFiles(container) {
    return async () => {
      try {
        await AttachmentFetcher.uploadNewAttachmentsForContainer(container);
        const response = await ContainerFetcher.updateContainer(container);

        NotificationActions.add({
          title: 'Analysis Updated.',
          message: 'Analysis has been updated.',
          level: 'success',
          position: 'tc'
        });
        return response.container;
      } catch (error) {
        console.error('Failed to update Analysis', error);
        throw error;
      }
    };
  }
}

export default alt.createActions(ContainerActions);
