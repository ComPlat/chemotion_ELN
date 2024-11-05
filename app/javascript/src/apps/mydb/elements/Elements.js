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
    const { showDetailView } = this.state;

    return (
      <div className="flex-grow-1">
        <PanelGroup className="p-3" direction="horizontal">
          <Panel defaultSize={40} className="overflow-x-auto">
            <div className="h-100" style={{ minWidth: '600px' }}>
              <ElementsList />
            </div>
          </Panel>

          {showDetailView && (
            <>
              <PanelResizeHandle>
                <Button>
                  <i className="fa fa-exchange" />
                </Button>
                <div className="elements_separator" />
              </PanelResizeHandle>
              <Panel defaultSize={60} className="overflow-x-auto">
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
