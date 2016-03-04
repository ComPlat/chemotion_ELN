import React from 'react';
import {Tabs, Tab} from 'react-bootstrap';

import MyCollections from './collection_management/MyCollections';
import MySharedCollections from './collection_management/MySharedCollections';

export default class CollectionManagement extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="collection-management">
        <Tabs defaultActiveKey={1} inverse>
          <Tab eventKey={1} title="My Collections">
            <MyCollections />
          </Tab>
          <Tab eventKey={2} title="My Shared Collections">
            <MySharedCollections />
          </Tab>
        </Tabs>
      </div>
    )
  }
}
