import React from 'react';
import {Tabs, Tab} from 'react-bootstrap';

import MyCollections from './collection_management/MyCollections';
import MySharedCollections from './collection_management/MySharedCollections';
import XTabs from "./extra/CollectionManagementXTabs";

export default class CollectionManagement extends React.Component {
  constructor(props) {
    super(props);
  }

  extraTab(ind,offset=0){
    const num = ind + offset + 1 ;
    let NoName =  XTabs[`content${ind}`];
    const Title = XTabs[`title${ind}`];
    return(
       <Tab eventKey={num} key={num} title={Title} >
           <NoName />
       </Tab>
      )
  }

  render() {
    const tabContents = []
    for (let j=0;j < XTabs.count;j++){
      if (XTabs['on'+j]()){
        tabContents.push((i)=>this.extraTab(i,2))
      }
    }
    return (
      <div id="collection-management">
        <Tabs defaultActiveKey={1} id="collection-management-tab">
          <Tab eventKey={1} title="My Collections">
            <MyCollections />
          </Tab>
          <Tab eventKey={2} title="My Shared Collections">
            <MySharedCollections />
          </Tab>
          {tabContents.map((e,i)=>e(i))}
        </Tabs>
      </div>
    )
  }
}
