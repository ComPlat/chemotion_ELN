import React from 'react';
import propTypes from 'prop-types';
import { Tabs, Tab, Modal } from 'react-bootstrap';

import MyCollections from 'src/apps/mydb/collections/MyCollections';
import MySharedCollections from 'src/apps/mydb/collections/MySharedCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import SyncWithMeCollections from 'src/apps/mydb/collections/SyncWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';

function CollectionManagementModal({ show, onHide }) {
  return (
    <Modal
      show={show}
      scrollable
      centered
      size="xxxl"
      contentClassName="vh-90"
      onHide={onHide}
    >
      <Modal.Header closeButton>
        Collection Management
      </Modal.Header>
      <Modal.Body>
        <Tabs defaultActiveKey={0} id="collection-management-tab" className="surface-tabs">
          <Tab eventKey={0} title="My Collections">
            <MyCollections />
          </Tab>
          <Tab eventKey={1} title="My Shared Collections">
            <MySharedCollections />
          </Tab>
          <Tab eventKey={2} title="Collections shared with me ">
            <SharedWithMeCollections />
          </Tab>
          <Tab eventKey={3} title="Collections synchronized with me ">
            <SyncWithMeCollections />
          </Tab>
          <Tab eventKey={4} title="Collection Tabs">
            <CollectionTabs />
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}

CollectionManagementModal.propTypes = {
  show: propTypes.bool.isRequired,
  onHide: propTypes.func.isRequired,
};

export default CollectionManagementModal;
