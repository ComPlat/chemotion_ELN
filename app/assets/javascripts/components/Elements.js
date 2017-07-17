import React, {Component} from 'react';
import {DragDropContext} from 'react-dnd';
import {Col} from 'react-bootstrap';
import HTML5Backend from 'react-dnd-html5-backend';

import List from './List';
import ElementDetails from './ElementDetails';
import ElementStore from './stores/ElementStore';

export default class Elements extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null,
    };
    this.handleOnChange = this.handleOnChange.bind(this)
  }

  componentDidMount() {
    ElementStore.listen(this.handleOnChange);
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.handleOnChange);
  }

  handleOnChange(state) {
    const { currentElement } = state;
    this.setState({ currentElement });
  }

  render() {
    const { currentElement } = this.state;
    const showReport = (currentElement || []).type === 'report'

    let md = 12
    let overview = currentElement ? false : true
    let page = null

    if (currentElement) {
      md = 4 
      page = (
        <Col md={8}>
          <ElementDetails currentElement={currentElement} />
        </Col>
      )
    }

    return (
      <div>
        <Col md={md}>
          <List overview={overview} showReport={showReport}/>
        </Col>
        {page}
      </div>
    );
  }
}

