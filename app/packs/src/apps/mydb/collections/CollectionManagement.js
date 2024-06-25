import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

import MyCollections from 'src/apps/mydb/collections/MyCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';

const CollectionManagement = () => {
  const tabContents = [
    <Tab eventKey={0} key={0} title="My Collections"><MyCollections /></Tab>,
    <Tab eventKey={1} key={1} title="Collections shared with me "><SharedWithMeCollections /></Tab>,
    <Tab eventKey={2} key={2} title="Collection Tabs"><CollectionTabs /></Tab>
  ];

  return (
    <div id="collection-management">
      <Tabs defaultActiveKey={0} id="collection-management-tab">
        {tabContents.map(e => e)}
      </Tabs>
    </div>
  );
};

export default CollectionManagement;
