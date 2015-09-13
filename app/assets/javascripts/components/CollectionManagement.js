import React from 'react';
import {TabbedArea, TabPane} from 'react-bootstrap';

import MyCollections from './collection_management/MyCollections';
import MySharedCollections from './collection_management/MySharedCollections';

export default class CollectionManagement extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div id="collection-management">
        <TabbedArea defaultActiveKey={1} inverse>
          <TabPane eventKey={1} tab="My Collections">
            <MyCollections />
          </TabPane>
          <TabPane eventKey={2} tab="My Shared Collections">
            <MySharedCollections />
          </TabPane>
        </TabbedArea>
      </div>
    )
  }
}
