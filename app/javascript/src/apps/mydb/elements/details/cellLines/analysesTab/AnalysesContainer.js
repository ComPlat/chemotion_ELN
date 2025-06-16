import React, { Component } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import {
  Accordion,
  Button,
  ListGroup,
  ButtonToolbar
} from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import OrderModeRow from 'src/apps/mydb/elements/details/cellLines/analysesTab/OrderModeRow';
import EditModeRow from 'src/apps/mydb/elements/details/cellLines/analysesTab/EditModeRow';
import PropTypes from 'prop-types';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

class AnalysesContainer extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor() {
    super();
    this.state = {
      mode: 'edit',
      commentBoxVisible: false,
    };
  }

  handleAdd = () => {
    const { item } = this.props;
    const { cellLineDetailsStore } = this.context;
    const newContainer = cellLineDetailsStore.addEmptyContainer(item.id);
    const { currentElement } = ElementStore.getState();
    currentElement.container.children[0].children.push(newContainer);
    this.handleChange(true);
  };

  handleStartDrag = (container) => {
    this.setState({ draggingContainer: container.id });
  };

  handleEndDrag = () => {
    this.setState({
      draggingContainer: '',
      lastHoveredContainer: ''
    });
  };

  handleModeToggle = () => {
    const { mode } = this.state;
    if (mode === 'edit') {
      this.setState({ mode: 'order' });
    } else {
      this.setState({ mode: 'edit' });
    }
  };

  handleHoverOver = (containerId) => {
    const { lastHoveredContainer } = this.state;
    if (lastHoveredContainer !== undefined
       && lastHoveredContainer === containerId) {
      return;
    }

    this.setState({ lastHoveredContainer: containerId });
  };

  handleChange = (changed = false) => {
    const { item } = this.props;
    if (changed) {
      const { cellLineDetailsStore } = this.context;
      cellLineDetailsStore.cellLines(item.id).setChanged(true);
    }
    this.forceUpdate();
  };

  handleCommentTextChange = (e) => {
    const { currentElement } = ElementStore.getState();
    currentElement.container.description = e.target.value;
    this.handleChange(true);
  };

  renderAddButton = () => {
    const { readOnly } = this.props;

    return (
      <Button
        size="sm"
        variant="success"
        onClick={() => this.handleAdd()}
        disabled={readOnly}
      >
        Add analysis
      </Button>
    );
  };

  toggleCommentBox = () => {
    this.setState((prevState) => ({ commentBoxVisible: !prevState.commentBoxVisible }));
  };

  renderModeButton = () => {
    const { mode } = this.state;
    const { readOnly } = this.props;
    const buttonText = mode === 'order' ? 'Order mode' : 'Edit mode';
    const buttonIcon = mode === 'order' ? 'fa fa-reorder' : 'fa fa-edit';
    const variant = mode === 'order' ? 'success' : 'primary';
    return (
      <Button
        disabled={readOnly}
        size="sm"
        variant={variant}
        onClick={() => this.handleModeToggle()}
      >
        <i className={`me-1 ${buttonIcon}`} aria-hidden="true" />
        {buttonText}
      </Button>
    );
  }

  renderEditModeContainer = () => {
    const { currentElement } = ElementStore.getState();
    const { readOnly } = this.props;

    const containers = currentElement.container.children[0].children;
    const analysisRows = containers.map((container) => (
      <EditModeRow
        key={container.id}
        handleChange={this.handleChange}
        element={currentElement}
        container={container}
        readOnly={readOnly}
      />
    ));

    return (
      <Accordion
        id={`cellLineAnalysisPanelGroupOf:${currentElement.id}`}
        className='border rounded overflow-hidden'
      >
        {analysisRows}
      </Accordion>
    );
  }

  renderOrderModeContainer = () => {
    const { currentElement } = ElementStore.getState();
    const { draggingContainer, lastHoveredContainer } = this.state;
    const containers = currentElement.container.children[0].children;

    const analysisRows = containers.map((container) => {
      const chosenElementClass = container.id === draggingContainer ? 'opacity-25' : '';
      const lastHoveredClass = lastHoveredContainer === container.id ? ' last-hovered-element' : '';
      const styleClass = chosenElementClass + lastHoveredClass;

      return (
        <ListGroup.Item className={`p-3 ${styleClass}`} key={container.id}>
          <OrderModeRow
            updateFunction={(e) => { this.handleChange(e); }}
            startDragFunction={() => { this.handleStartDrag(container); }}
            endDragFunction={() => { this.handleEndDrag(container); }}
            hoverOverItem={(e) => { this.handleHoverOver(e); }}
            container={container}
          />
        </ListGroup.Item>
      );
    });

    return (
      <ListGroup>
        {analysisRows}
      </ListGroup>
    );
  }

  renderContainerPanel = () => {
    const { currentElement } = ElementStore.getState();
    const containers = currentElement.container.children[0].children;

    const { mode } = this.state;

    if (containers.length === 0) {
      return <div>There are currently no analyses</div>;
    }

    return (mode === 'edit')
      ? this.renderEditModeContainer()
      : this.renderOrderModeContainer();
  };

  render() {
    const { commentBoxVisible } = this.state;
    const { currentElement } = ElementStore.getState();
    return (
      <div className="analysis-container">
        <div className="d-flex justify-content-between mb-3 sticky-top bg-white p-2 border-bottom">
          {this.renderModeButton()}
          <ButtonToolbar className="gap-2">
            <CommentButton toggleCommentBox={this.toggleCommentBox} size="xsm" disable={false} />
            {this.renderAddButton()}
          </ButtonToolbar>
        </div>
        <CommentBox
          isVisible={commentBoxVisible}
          value={currentElement.container.description}
          handleCommentTextChange={this.handleCommentTextChange}
        />
        {this.renderContainerPanel()}
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
