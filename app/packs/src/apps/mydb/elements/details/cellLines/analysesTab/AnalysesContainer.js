import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { Button } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import OrderModeRow from 'src/apps/mydb/elements/details/cellLines/analysesTab/OrderModeRow';
import EditModeRow from 'src/apps/mydb/elements/details/cellLines/analysesTab/EditModeRow';
import PropTypes from 'prop-types';
import PanelGroup from 'src/components/legacyBootstrap/PanelGroup'

class AnalysesContainer extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor() {
    super();
    this.state = {
      openPanel: 'none',
      mode: 'edit'
    };
    this.handleChange.bind(this);
    this.handleHoverOver.bind(this);
  }

  handleAdd() {
    const { item } = this.props;
    const { cellLineDetailsStore } = this.context;
    const newContainer = cellLineDetailsStore.addEmptyContainer(item.id);
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

  handleStartDrag(container) {
    this.setState({ draggingContainer: container.id });
  }

  handleEndDrag() {
    this.setState({
      draggingContainer: '',
      lastHoveredContainer: ''
    });
  }

  handleModeToggle() {
    const { mode } = this.state;
    if (mode === 'edit') {
      this.setState({ mode: 'order' });
    } else {
      this.setState({ mode: 'edit' });
    }
  }

  handleHoverOver(containerId) {
    const { lastHoveredContainer } = this.state;
    if (lastHoveredContainer !== undefined
       && lastHoveredContainer === containerId) {
      return;
    }

    this.setState({ lastHoveredContainer: containerId });
  }

  handleChange(changed = false) {
    const { item } = this.props;
    if (changed) {
      const { cellLineDetailsStore } = this.context;
      cellLineDetailsStore.cellLines(item.id).setChanged(true);
    }
    this.forceUpdate();
  }

  renderAddButton() {
    const { readOnly } = this.props;

    return (
      <div className="add-button">
        <Button
          bsSize="xsmall"
          bsStyle="success"
          onClick={() => this.handleAdd()}
          disabled={readOnly}
        >
          Add analysis
        </Button>
      </div>
    );
  }

  renderOrderModeButton() {
    const { mode } = this.state;
    const { readOnly } = this.props;
    const buttonText = mode === 'order' ? 'Order mode' : 'Edit mode';
    const buttonIcon = mode === 'order' ? 'fa fa-reorder' : 'fa fa-edit';
    const styleClass = mode === 'order' ? 'orderMode' : 'editMode';
    return (
      <div className="order-mode-button">
        <Button
          disabled={readOnly}
          bsSize="xsmall"
          className=""
          bsStyle={styleClass}
          onClick={() => this.handleModeToggle()}
        >
          <i className={buttonIcon} aria-hidden="true" />
          {buttonText}
        </Button>
      </div>
    );
  }

  renderContainerPanel() {
    const { currentElement } = ElementStore.getState();
    const { draggingContainer, lastHoveredContainer } = this.state;
    const containers = currentElement.container.children[0].children;

    const { mode } = this.state;
    const { readOnly } = this.props;

    const analysisRows = mode === 'edit'
      ? containers.map((container) => (
        <EditModeRow
          key={container.id}
          parent={this}
          element={currentElement}
          container={container}
          readOnly={readOnly}
        />
      ), this)
      : containers.map(
        (container) => {
          const chosenElementClass = container.id === draggingContainer ? 'chosen-element' : '';
          const lastHoveredClass = lastHoveredContainer === container.id ? ' last-hovered-element' : '';
          const styleClass = chosenElementClass + lastHoveredClass;
          return (
            <div className={styleClass} key={container.id}>
              <OrderModeRow
                updateFunction={(e) => { this.handleChange(e); }}
                startDragFunction={() => { this.handleStartDrag(container); }}
                endDragFunction={() => { this.handleEndDrag(container); }}
                hoverOverItem={(e) => { this.handleHoverOver(e); }}
                container={container}
              />
            </div>
          );
        },

        this
      );

    const { openPanel } = this.state;
    if (containers.length > 0) {
      return (
        <div className="analyses">
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
    return <div className="no-analyses-panel">There are currently no analyses</div>;
  }

  render() {
    return (
      <div className="analysis-container">
        <div>
          {this.renderOrderModeButton()}
          {this.renderAddButton()}
        </div>
        { this.renderContainerPanel()}
      </div>
    );
  }
}
export default observer(AnalysesContainer);

AnalysesContainer.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired
};
