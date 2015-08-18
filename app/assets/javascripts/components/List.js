import React from 'react';
import ElementsTable from './ElementsTable';
import {TabbedArea, TabPane} from 'react-bootstrap';

export default class List extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <TabbedArea defaultActiveKey={1}>
        <TabPane eventKey={1} tab='Samples'>
          <ElementsTable type='sample'/>
        </TabPane>
        <TabPane eventKey={2} tab='Reactions' disabled>TabPane 2 content</TabPane>
        <TabPane eventKey={3} tab='Wellplates' disabled>TabPane 3 content</TabPane>
      </TabbedArea>

    )
  }
}
