import React, { useState } from 'react';
import propTypes from 'prop-types';
import { Tabs, Tab, Modal } from 'react-bootstrap';

import MyCollections from 'src/apps/mydb/collections/MyCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';

function CollectionManagementModal({ show, onHide }) {
  const [activeKey, setActiveKey] = useState('own');
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
        <Tabs activeKey={activeKey} id="collection-management-tab" onSelect={(key) => setActiveKey(key)} className="surface-tabs">
          <Tab eventKey="own" title="My Collections">
            <MyCollections activeKey={activeKey} />
          </Tab>
          <Tab eventKey="shared" title="Collections shared with me ">
            <SharedWithMeCollections />
          </Tab>
          <Tab eventKey="tabs" title="Collection Tabs">
            <CollectionTabs activeKey={activeKey} />
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
