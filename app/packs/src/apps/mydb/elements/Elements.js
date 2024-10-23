import React, { Component } from 'react';
import { Col } from 'react-bootstrap';

import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import ElementDetails from 'src/apps/mydb/elements/details/ElementDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';

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
    this.handleOnChange(ElementStore.getState());
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
    const hasCurrentElement = currentElement !== null;

    const listWidth = hasCurrentElement ? 5 : 12;

    return (
      <div className="flex-grow-1 d-flex ps-3 pt-2">
        <Col xs={listWidth} className="pe-3">
          <ElementsList
            overview={!hasCurrentElement}
          />
        </Col>
        {hasCurrentElement && (
          <Col xs={7} className="pe-3">
            <ElementDetails currentElement={currentElement} />
          </Col>
        )}
      </div>
    );
  }
}
