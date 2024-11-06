import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

import MyCollections from 'src/apps/mydb/collections/MyCollections';
import MySharedCollections from 'src/apps/mydb/collections/MySharedCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import SyncWithMeCollections from 'src/apps/mydb/collections/SyncWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';

export default function CollectionManagement() {
  return (
    <div className="tabs-container--with-borders">
      <Tabs defaultActiveKey={0} id="collection-management-tab">
        <Tab eventKey={0} title="My Collections"><MyCollections /></Tab>
        <Tab eventKey={1} title="My Shared Collections"><MySharedCollections /></Tab>
        <Tab eventKey={2} title="Collections shared with me "><SharedWithMeCollections /></Tab>
        <Tab eventKey={3} title="Collections synchronized with me "><SyncWithMeCollections /></Tab>
        <Tab eventKey={4} title="Collection Tabs"><CollectionTabs /></Tab>
      </Tabs>
    </div>
  );
}
