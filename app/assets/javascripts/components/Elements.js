import React, {Component} from 'react';
import {DragDropContext} from 'react-dnd';
import {Col} from 'react-bootstrap';
import HTML5Backend from 'react-dnd-html5-backend';

import List from './List';
import ElementDetails from './ElementDetails';
import ElementStore from './stores/ElementStore';

class Elements extends Component {
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

    let list = (
      <Col md={12} style={{paddingLeft: "10px"}}>
        <List overview={false} showReport={showReport}/>
      </Col>
    )
    let page = (<span />)

    if (currentElement) {
      list = (
        <Col md={4}>
          <List overview={false} showReport={showReport}/>
        </Col>
      )
      page = (
        <Col md={8}>
          <ElementDetails currentElement={currentElement} />
        </Col>
      )
    }

    return (
      <div>
        {list}
        {page}
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(Elements);
