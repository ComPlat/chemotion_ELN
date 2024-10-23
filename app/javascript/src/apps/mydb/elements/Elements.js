import React, { Component } from 'react';
import { Col } from 'react-bootstrap';

import ElementsList from 'src/apps/mydb/elements/list/ElementsList';
import ElementDetails from 'src/apps/mydb/elements/details/ElementDetails';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class Elements extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      showElementDetails: ElementStore.getState().currentElement !== null,
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

  handleOnChange({ currentElement }) {
    if (currentElement && currentElement.type === 'device_description') {
      const { deviceDescriptions } = this.context;
      deviceDescriptions.addDeviceDescriptionToOpen(currentElement);
    }
    this.setState({ showElementDetails: currentElement !== null });
  }

  render() {
    const { showElementDetails } = this.state;
    const listWidth = showElementDetails ? 5 : 12;

    return (
      <div className="flex-grow-1 d-flex ps-3 pt-2">
        <Col xs={listWidth} className="pe-3">
          <ElementsList />
        </Col>
        {showElementDetails && (
          <Col xs={7} className="pe-3">
            <ElementDetails />
          </Col>
        )}
      </div>
    );
  }
}
