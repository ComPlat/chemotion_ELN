/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

class ContainerActions {
  updateContainerWithFiles(container, isNew = false, type = 'Analysis') {
    return async () => {
      if (isNew) {
        NotificationActions.add({
          title: `Error on ${type} Creation.`,
          message: `Create ${type} before adding Analysis.`,
          level: 'error',
          position: 'tc'
        });
        return Promise.reject(new Error(`${type} creation blocked — sample is new.`));
      }
      try {
        await AttachmentFetcher.uploadNewAttachmentsForContainer(container);
        const response = await ContainerFetcher.updateContainer(container);

        NotificationActions.add({
          title: `${type} Updated.`,
          message: `Analysis has been updated in ${type}.`,
          level: 'success',
          position: 'tc'
        });
        return response.container;
      } catch (error) {
        console.error(`Failed to update ${type}:`, error);
        throw error;
      }
    };
  }
}

export default alt.createActions(ContainerActions);
