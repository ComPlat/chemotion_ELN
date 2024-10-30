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
      showDetailView: false
    };

    this.onElementStoreChange = this.onElementStoreChange.bind(this);
  }

  componentDidMount() {
    ElementStore.listen(this.onElementStoreChange);
    this.onElementStoreChange(ElementStore.getState());
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onElementStoreChange);
  }

  onElementStoreChange(state) {
    const { currentElement } = state;
    if (currentElement && currentElement.type == 'device_description') {
      this.context.deviceDescriptions.setDeviceDescription(currentElement, true);
    }

    const { showDetailView } = this.state;

    const newShowDetailView = currentElement !== null;
    if (showDetailView !== newShowDetailView) {
      this.setState({ showDetailView: newShowDetailView });
    }
  }

  render() {
    const { showDetailView } = this.state;
    const detailWidth = showDetailView ? 7 : 0;
    const listWidth = 12 - detailWidth;

    return (
      <div className="flex-grow-1 d-flex ps-3 pt-2">
        <Col xs={listWidth} className="pe-3">
          <ElementsList overview={!showDetailView} />
        </Col>
        {showDetailView && (
          <Col xs={detailWidth} className="pe-3">
            <ElementDetails />
          </Col>
        )}
      </div>
    );
  }
}
