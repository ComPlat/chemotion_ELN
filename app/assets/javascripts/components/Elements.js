import React, {Component} from 'react';
import {DragDropContext} from 'react-dnd';
import {Col} from 'react-bootstrap';
import HTML5Backend from 'react-dnd/modules/backends/HTML5';
import List from './List';
import ElementDetails from './ElementDetails';


class Elements extends Component {
  render() {
    return (
      <div>
        <Col md={4}>
          <List/>
        </Col>
        <Col md={8}>
          <ElementDetails/>
        </Col>
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(Elements);
