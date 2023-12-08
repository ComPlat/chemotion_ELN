import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import CollectionUtils from 'src/models/collection/CollectionUtils';

import {
  Panel, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import GeneralProperties from 'src/apps/mydb/elements/details/cellLines/propertiesTab/GeneralProperties';
import AnalysesContainer from 'src/apps/mydb/elements/details/cellLines/analysesTab/AnalysesContainer';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';

class CellLineDetails extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'tab1',
      readOnly: this.isReadOnly()
    };
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
  }

  handleSubmit(cellLineItem) {
    // eslint-disable-next-line react/destructuring-assignment
    const mobXItem = this.context.cellLineDetailsStore.cellLines(this.props.cellLineItem.id);
    cellLineItem.adoptPropsFromMobXModel(mobXItem);

    if (cellLineItem.is_new) {
      DetailActions.close(cellLineItem, true);
      ElementActions.createCellLine(cellLineItem);
    } else {
      ElementActions.updateCellLine(cellLineItem);
    }
    mobXItem.setChanged(false);
  }

  handleClose(cellLineItem) {
    const { cellLineDetailsStore } = this.context;
    const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
    // eslint-disable-next-line no-alert
    if (!mobXItem.changed || window.confirm('Unsaved data will be lost.Close sample?')) {
      cellLineDetailsStore.removeCellLineFromStore(cellLineItem.id);
      DetailActions.close(cellLineItem, true);
    }
  }

  handleTabChange(eventKey) {
    this.setState({ activeTab: eventKey });
  }

  onTabPositionChanged(visible) {
    // eslint-disable-next-line react/no-unused-state
    this.setState({ visible });
  }

  isReadOnly() {
    const { currentCollection, isSync } = UIStore.getState();
    const { currentUser } = UserStore.getState();

    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  }

  renderHeaderContent() {
    const { cellLineItem } = this.props;

    return (
      <div>

        <ElementCollectionLabels
          class="collection-label floating"
          element={cellLineItem}
          key={cellLineItem.id}
          placement="right"
        />
        <div className="floating header">
          {' '}
          <i className="icon-cell_line" />
          {cellLineItem.short_label}
        </div>

        {this.renderCloseHeaderButton()}
        {this.renderEnlargenButton()}
        {this.renderSaveButton()}
        {this.renderSaveButton(true)}
      </div>
    );
  }

  renderEnlargenButton() {
    const { toggleFullScreen } = this.props;
    return (
      <Button
        bsStyle="info"
        bsSize="xsmall"
        className="button-right"
        onClick={toggleFullScreen}
      >
        <i className="fa fa-expand" />
      </Button>
    );
  }

  renderSaveButton(closeAfterClick = false) {
    const { cellLineItem } = this.props;
    const { cellLineDetailsStore } = this.context;
    const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
    const validationInfo = cellLineDetailsStore.checkInputValidity(cellLineItem.id);
    const disabled = validationInfo.length > 0 || !mobXItem.changed;
    if (disabled) { return null; }

    const action = closeAfterClick
      ? () => { this.handleSubmit(cellLineItem); DetailActions.close(cellLineItem, true); }
      : () => { this.handleSubmit(cellLineItem); };

    const toolTipMessage = closeAfterClick ? 'save and close' : 'save';
    const icons = closeAfterClick
      ? (
        <div>
          <i className="fa fa-floppy-o" />
          <i className="fa fa-times" />
        </div>
      )
      : <i className="fa fa-floppy-o" />;

    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip>{toolTipMessage}</Tooltip>}
      >
        <Button disabled={disabled} bsStyle="warning" bsSize="xsmall" className="button-right" onClick={action}>
          {icons}
        </Button>
      </OverlayTrigger>
    );
  }

  renderCloseHeaderButton() {
    const { cellLineItem } = this.props;

    return (
      <Button
        bsStyle="danger"
        bsSize="xsmall"
        className="button-right"
        onClick={() => { this.handleClose(cellLineItem); }}
      >
        <i className="fa fa-times" />
      </Button>
    );
  }

  renderSubmitButton() {
    const { cellLineItem } = this.props;
    const { cellLineDetailsStore } = this.context;
    const mobXItem = cellLineDetailsStore.cellLines(cellLineItem.id);
    const validationInfo = cellLineDetailsStore.checkInputValidity(cellLineItem.id);
    const disabled = validationInfo.length > 0 || !mobXItem.changed;
    const buttonText = cellLineItem.is_new ? 'Create' : 'Save';
    const disabledButton = (
      <Button
        bsStyle="warning"
        disabled
        onClick={() => { this.handleSubmit(cellLineItem); }}
      >
        {buttonText}
      </Button>
    );
    const enabledButton = (
      <Button
        bsStyle="warning"
        onClick={() => { this.handleSubmit(cellLineItem); }}
      >
        {buttonText}
      </Button>
    );

    return disabled ? disabledButton : enabledButton;
  }

  render() {
    const { cellLineItem } = this.props;

    if (!cellLineItem) { return (null); }
    // eslint-disable-next-line react/destructuring-assignment
    this.context.cellLineDetailsStore.convertCellLineToModel(cellLineItem);
    const { readOnly } = this.state;
    const { activeTab } = this.state;
    return (
      <Panel
        className="eln-panel-detail"
      >
        <Panel.Heading className="blue-background">{this.renderHeaderContent()}</Panel.Heading>
        <Panel.Body>
          <Tabs activeKey={activeTab} onSelect={(event) => this.handleTabChange(event)} id="cell-line-details-tab">
            <Tab eventKey="tab1" title="Properties" key="tab1">
              <GeneralProperties
                item={cellLineItem}
                readOnly={readOnly}
              />
            </Tab>
            <Tab eventKey="tab2" title="Analyses" key="tab2">
              <AnalysesContainer
                item={cellLineItem}
                readOnly={readOnly}
              />
            </Tab>
            <Tab eventKey="tab3" title="References" key="tab3" disabled={cellLineItem.is_new}>
              <DetailsTabLiteratures
                readOnly={readOnly}
                element={cellLineItem}
                literatures={cellLineItem.is_new === true ? cellLineItem.literatures : null}
              />
            </Tab>
          </Tabs>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => { this.handleClose(cellLineItem); }}>
              Close
            </Button>
            {this.renderSubmitButton()}

          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

export default observer(CellLineDetails);

CellLineDetails.propTypes = {
  cellLineItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    itemName: PropTypes.string.isRequired,
    cellLineName: PropTypes.string.isRequired,
    short_label: PropTypes.string.isRequired,
    is_new: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    literatures: PropTypes.arrayOf(PropTypes.object),
    disease: PropTypes.string.isRequired
  }).isRequired,
  toggleFullScreen: PropTypes.func.isRequired
};
