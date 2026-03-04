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
  Button, Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import GeneralProperties from 'src/apps/mydb/elements/details/cellLines/propertiesTab/GeneralProperties';
import AnalysesContainer from 'src/apps/mydb/elements/details/cellLines/analysesTab/AnalysesContainer';
import DetailsTabLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ConfirmClose from 'src/components/common/ConfirmClose';

class CellLineDetails extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'tab1',
      readOnly: this.isReadOnly()
    };
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

  isReadOnly() {
    const { currentCollection, isSync } = UIStore.getState();
    const { currentUser } = UserStore.getState();

    if (!currentCollection) { return false }

    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  }

  renderHeaderContent() {
    const { cellLineItem } = this.props;

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex gap-2">
          <span>
            <i className="icon-cell_line me-1" />
            {cellLineItem.short_label}
          </span>
          <ElementCollectionLabels
            className="collection-label"
            element={cellLineItem}
            key={cellLineItem.id}
            placement="right"
          />
        </div>
        <div className="d-flex gap-1">
          {this.renderSaveButton(true)}
          {this.renderSaveButton()}
          {this.renderCloseHeaderButton()}
        </div>
      </div>
    );
  }

  renderFooterContent() {
    const { cellLineItem } = this.props;

    return (
      <>
        <Button variant="primary" onClick={() => { this.handleClose(cellLineItem); }}>
          Close
        </Button>
        {this.renderSubmitButton()}
      </>
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

    const toolTipMessage = closeAfterClick ? 'Save and Close' : 'Save';
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
        <Button disabled={disabled} variant="warning" size="xxsm" onClick={action}>
          {icons}
        </Button>
      </OverlayTrigger>
    );
  }

  renderCloseHeaderButton() {
    const { cellLineItem } = this.props;

    return (<ConfirmClose el={cellLineItem} />);
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
        variant="warning"
        disabled
        onClick={() => { this.handleSubmit(cellLineItem); }}
      >
        {buttonText}
      </Button>
    );
    const enabledButton = (
      <Button
        variant="warning"
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
      <DetailCard
        header={this.renderHeaderContent()}
        footer={this.renderFooterContent()}
      >
        <div className="tabs-container--with-borders">
          <Tabs activeKey={activeTab} onSelect={(event) => this.handleTabChange(event)}>
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
                literatures={cellLineItem.is_new ? cellLineItem.literatures : null}
              />
            </Tab>
          </Tabs>
        </div>
      </DetailCard>
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
};
