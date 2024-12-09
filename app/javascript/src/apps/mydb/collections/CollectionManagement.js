import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import Sheet from 'src/components/common/Sheet';
import MyCollections from 'src/apps/mydb/collections/MyCollections';
import MySharedCollections from 'src/apps/mydb/collections/MySharedCollections';
import SharedWithMeCollections from 'src/apps/mydb/collections/SharedWithMeCollections';
import SyncWithMeCollections from 'src/apps/mydb/collections/SyncWithMeCollections';
import CollectionTabs from 'src/apps/mydb/collections/CollectionTabs';

export default function CollectionManagement() {
  return (
    <div className="p-3">
      <Tabs defaultActiveKey={0} id="collection-management-tab" className="sheet-tabs">
        <Tab eventKey={0} title="My Collections">
          <Sheet>
            <MyCollections />
          </Sheet>
        </Tab>
        <Tab eventKey={1} title="My Shared Collections">
          <Sheet>
            <MySharedCollections />
          </Sheet>
        </Tab>
        <Tab eventKey={2} title="Collections shared with me ">
          <Sheet>
            <SharedWithMeCollections />
          </Sheet>
        </Tab>
        <Tab eventKey={3} title="Collections synchronized with me ">
          <Sheet>
            <SyncWithMeCollections />
          </Sheet>
        </Tab>
        <Tab eventKey={4} title="Collection Tabs">
          <Sheet>
            <CollectionTabs />
          </Sheet>
        </Tab>
      </Tabs>
    </div>
  );
}
