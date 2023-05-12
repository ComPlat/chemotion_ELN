import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { PanelGroup, Button } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CellLineAnalysisOrderRow from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisOrderRow';
import CellLineAnalysisEditRow from 'src/apps/mydb/elements/details/cellLines/CellLineDetailsEditRow';
import PropTypes from 'prop-types';

class CellLineDetailsContainers extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor() {
    super();
    this.state = { openPanel: 'none', mode: 'edit' };
    this.handleChange.bind(this);
  }

  handleAdd() {
    // eslint-disable-next-line react/destructuring-assignment
    const newContainer = this.context.cellLineDetailsStore.addEmptyContainer(this.props.item.id);
    const { currentElement } = ElementStore.getState();
    currentElement.container.children[0].children.push(newContainer);
    this.forceUpdate();
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

  handleChange() {
    this.forceUpdate();
  }

  renderAddButton() {
    return (
      <Button className="button-right" bsSize="xsmall" bsStyle="success" onClick={() => this.handleAdd()}>
        Add analysis
      </Button>
    );
  }

  renderOrderModeButton() {
    const { mode } = this.state;
    return (
      <Button bsSize="xsmall" bsStyle="success" onClick={() => this.handleModeToggle()}>
        {mode}
      </Button>
    );
  }

  renderContainerPanel() {
    const { currentElement } = ElementStore.getState();
    const containers = currentElement.container.children[0].children;
    const { mode } = this.state;
    const analysisRows = mode === 'edit'
      ? containers.map((container) => (
        <CellLineAnalysisEditRow
          key={container.id}
          parent={this}
          element={currentElement}
          container={container}
        />
      ), this)
      : containers.map((container) => (
        <CellLineAnalysisOrderRow
          key={container.id}
          updateFunction={() => { this.handleChange(); }}
          container={container}
        />
      ), this);

    const { openPanel } = this.state;
    if (containers.length > 0) {
      return (
        <div>
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
    return <div />;
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
export default observer(CellLineDetailsContainers);

CellLineDetailsContainers.propTypes = {
  item: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
  })).isRequired
};
