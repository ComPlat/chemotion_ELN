import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

import ScrollContainer from 'src/components/common/ScrollContainer';
import MyCollections from 'src/apps/mydb/collections/MyCollections';
import MySharedCollections from 'src/apps/mydb/collections/MySharedCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import SyncWithMeCollections from 'src/apps/mydb/collections/SyncWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';

export default function CollectionManagement() {
  return (
    <div className="tabs-container--with-borders tabs-container--with-full-height">
      <Tabs defaultActiveKey={0} id="collection-management-tab">
        <Tab eventKey={0} title="My Collections">
          <ScrollContainer>
            <MyCollections />
          </ScrollContainer>
        </Tab>
        <Tab eventKey={1} title="My Shared Collections">
          <ScrollContainer>
            <MySharedCollections />
          </ScrollContainer>
        </Tab>
        <Tab eventKey={2} title="Collections shared with me ">
          <ScrollContainer>
            <SharedWithMeCollections />
          </ScrollContainer>
        </Tab>
        <Tab eventKey={3} title="Collections synchronized with me ">
          <ScrollContainer>
            <SyncWithMeCollections />
          </ScrollContainer>
        </Tab>
        <Tab eventKey={4} title="Collection Tabs">
          <ScrollContainer>
            <CollectionTabs />
          </ScrollContainer>
        </Tab>
      </Tabs>
    </div>
  );
}
