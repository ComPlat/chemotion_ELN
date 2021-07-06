import React, { Component } from 'react';
import { Col } from 'react-bootstrap';

import List from './List';
import ElementDetails from './ElementDetails';
import ElementStore from './stores/ElementStore';

export default class Elements extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null
    };

    this.handleOnChange = this.handleOnChange.bind(this);
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
    const showReport = (currentElement || []).type === 'report';

    let md = 12;
    const overview = !(currentElement);
    let page = null;

    if (currentElement) {
      md = 5;
      page = (
        <Col md={7} className="small-col">
          <ElementDetails currentElement={currentElement} />
        </Col>
      );
    }

    return (
      <div>
        <Col md={md} className="small-col">
          <List overview={overview} showReport={showReport} />
        </Col>
        {page}
      </div>
    );
  }
}

