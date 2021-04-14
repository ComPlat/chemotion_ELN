import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

import MyCollections from './collection_management/MyCollections';
import MySharedCollections from './collection_management/MySharedCollections';
import SharedWithMeCollections from './collection_management/SharedWithMeCollections';
import SyncWithMeCollections from './collection_management/SyncWithMeCollections';
import XTabs from './extra/CollectionManagementXTabs';

const CollectionManagement = () => {
  const tabContents = [
    <Tab eventKey={0} key={0} title="My Collections"><MyCollections /></Tab>,
    <Tab eventKey={1} key={1} title="My Shared Collections"><MySharedCollections /></Tab>,
    <Tab eventKey={2} key={2} title="Collections shared with me "><SharedWithMeCollections /></Tab>,
    <Tab eventKey={3} key={3} title="Collections synchronized with me "><SyncWithMeCollections /></Tab>,
  ];
  const offset = tabContents.length;
  for (let j = 0; j < XTabs.count; j += 1) {
    if (XTabs[`on${j}`]()) {
      const NoName = XTabs[`content${j}`];
      tabContents.push((
        <Tab eventKey={offset + j} key={offset + j} title={XTabs[`title${j}`]} >
          <NoName />
        </Tab>
      ));
    }
  }

  return (
    <div id="collection-management">
      <Tabs defaultActiveKey={0} id="collection-management-tab">
        {tabContents.map(e => e)}
      </Tabs>
    </div>
  );
};

export default CollectionManagement;
