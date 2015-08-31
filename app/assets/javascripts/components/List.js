import React from 'react';
import ElementsTable from './ElementsTable';
import {TabbedArea, TabPane} from 'react-bootstrap';

export default class List extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var samples = <i className="icon-sample"></i>,
        reactions = <i className="icon-reaction"></i>,
        wellplates = <i className="icon-wellplate"></i>;
    return (
      <TabbedArea defaultActiveKey={1}>
        <TabPane eventKey={1} tab={samples}>
          <ElementsTable type='sample'/>
        </TabPane>
        <TabPane eventKey={2} tab={reactions} disabled>TabPane 2 content</TabPane>
        <TabPane eventKey={3} tab={wellplates} disabled>TabPane 3 content</TabPane>
      </TabbedArea>
    )
  }
}
