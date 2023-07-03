import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { PanelGroup, Button } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import OrderModeRow from 'src/apps/mydb/elements/details/cellLines/analysesTab/OrderModeRow';
import EditModeRow from 'src/apps/mydb/elements/details/cellLines/analysesTab/EditModeRow';
import PropTypes from 'prop-types';

class AnalysesContainer extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor() {
    super();
    this.state = { openPanel: 'none', mode: 'edit' };
    this.handleChange.bind(this);
  }

  handleAdd() {
    const {cellLineDetailsStore} = this.context;
    const newContainer = cellLineDetailsStore.addEmptyContainer(this.props.item.id);
    const { currentElement } = ElementStore.getState();
    currentElement.container.children[0].children.push(newContainer);
    this.handleChange(true);
  }

  // eslint-disable-next-line react/no-unused-class-component-methods
  handleClickOnPanelHeader(containerId) {
    const { openPanel } = this.state;
    if (openPanel === containerId) {
      this.setState({ openPanel: 'none' });
    } else {
      this.setState({ openPanel: containerId });
    }
  }

  handleModeToggle() {
    const { mode } = this.state;
    if (mode === 'edit') {
      this.setState({ mode: 'order' });
    } else {
      this.setState({ mode: 'edit' });
    }
  }

  handleChange(changed=false) {

    if(changed){
 const {cellLineDetailsStore} = this.context;
 cellLineDetailsStore.cellLines(this.props.item.id).setChanged(true)
    }
    this.forceUpdate();
  }

  renderAddButton() {
    return (
      <div class="add-button">
      <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
        Add analysis
      </Button>
      </div>
    );
  }

  renderOrderModeButton() {
    const { mode } = this.state;
    return (
      <div class="order-mode-button">
      <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleModeToggle()}>
        {mode}
      </Button>
      </div>
    );
  }

  renderContainerPanel() {
    const { currentElement } = ElementStore.getState();
    const containers = currentElement.container.children[0].children;
    
    const { mode } = this.state;

    const analysisRows = mode === 'edit'
      ? containers.map((container) => (
        <EditModeRow
          key={container.id}
          parent={this}
          element={currentElement}
          container={container}
        />
      ), this)
      : containers.map((container) => (
        <OrderModeRow
          key={container.id}
          updateFunction={() => { this.handleChange(); }}
          container={container}
        />
      ), this);

    const { openPanel } = this.state;
    if (containers.length > 0) {
      return (
        <div class="analyses">
          <PanelGroup
            id={`cellLineAnalysisPanelGroupOf:${currentElement.id}`}
            defaultActiveKey="none"
            activeKey={openPanel}
            accordion
            onSelect={() => {}}
          >
            {analysisRows}
          </PanelGroup>
        </div>
      );
    }
    return <div class="no-analyses-panel">There are currently no analyses</div>;
  }

  render() {
    return (
      <div>
        <p>
          {this.renderOrderModeButton()}
          {this.renderAddButton()}
        </p>
        { this.renderContainerPanel()}

      </div>
    );
  }
}
export default observer(AnalysesContainer);

AnalysesContainer.propTypes = {
  item: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
  })).isRequired
};
