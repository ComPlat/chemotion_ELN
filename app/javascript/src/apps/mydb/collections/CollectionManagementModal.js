import React, { useContext } from 'react';
import propTypes from 'prop-types';
import { Tabs, Tab } from 'react-bootstrap';

import MyCollections from 'src/apps/mydb/collections/MyCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';
import AppModal from 'src/components/common/AppModal';
import { StoreContext } from 'src/stores/mobx/RootStore';
import CollectionManagementMenu from 'src/apps/mydb/collections/CollectionManagementMenu';

function CollectionManagementModal({ show, onHide }) {
  const collectionsStore = useContext(StoreContext).collections;

  const closeModal = () => {
    collectionsStore.setUpdateTree(false);
    onHide();
  };

  return (
    <AppModal
      show={show}
      size="xxxl"
      contentClassName="vh-90"
      onHide={closeModal}
      title="Collection Management"
      scrollable
    >
      <CollectionManagementMenu />
      <Tabs defaultActiveKey={0} id="collection-management-tab" className="surface-tabs">
        <Tab eventKey="0" title="My Collections">
          <MyCollections />
        </Tab>
        <Tab eventKey="1" title="Collections shared with me ">
          <SharedWithMeCollections />
        </Tab>
        <Tab eventKey="2" title="Collection Tabs">
          <CollectionTabs />
        </Tab>
      </Tabs>
    </AppModal>
  );
}

CollectionManagementModal.propTypes = {
  show: propTypes.bool.isRequired,
  onHide: propTypes.func.isRequired,
};

export default CollectionManagementModal;
