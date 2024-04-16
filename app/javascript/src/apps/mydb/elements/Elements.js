import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';

import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import ElementDetails from 'src/apps/mydb/elements/details/ElementDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class Elements extends Component {
  static contextType = StoreContext;

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
    if (currentElement && currentElement.type == 'device_description') {
      this.context.deviceDescriptions.setDeviceDescription(currentElement, true);
    }
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
