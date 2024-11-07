import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

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
      this.context.deviceDescriptions.addDeviceDescriptionToOpen(currentElement);
    }

    const { showDetailView } = this.state;

    const newShowDetailView = currentElement !== null;
    if (showDetailView !== newShowDetailView) {
      this.setState({ showDetailView: newShowDetailView });
    }
  }

  render() {
    const { showDetailView } = this.state;
    return (
      <div className="flex-grow-1">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={40} className="overflow-x-auto pt-3 px-3">
            <div className="h-100" style={{ minWidth: '600px' }}>
              <ElementsList overview={!showDetailView} />
            </div>
          </Panel>

          {showDetailView && (
            <>
              <PanelResizeHandle className="panel-resize-handle">
                <Button className="panel-collapse-button" onClick={() => {alert('auf und zu!')}}>
                  <i className="fa fa-angle-double-left" />
                </Button>
              </PanelResizeHandle>
              <Panel defaultSize={60} className="overflow-x-auto pt-3 px-3">
                <div className="h-100" style={{ minWidth: '680px' }}>
                  <ElementDetails />
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    );
  }
}
