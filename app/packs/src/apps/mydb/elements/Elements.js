import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';

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
      <Row className='w-100'>
        <Col xs={listWidth}>
          <ElementsList
            overview={!hasCurrentElement}
          />
        </Col>
        {hasCurrentElement && (
          <Col xs={7}>
            <ElementDetails currentElement={currentElement} />
          </Col>
        )}
      </Row>
    );
  }
}
