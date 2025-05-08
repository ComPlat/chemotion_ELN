import React, { useState, useContext, useEffect, createRef } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { ButtonToolbar, Button, Card, Tabs, Tab, OverlayTrigger, Tooltip, Popover } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import CollectionUtils from 'src/models/collection/CollectionUtils';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ConfirmClose from 'src/components/common/ConfirmClose';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';
import VesselAttachmentsContainer from "src/apps/mydb/elements/details/vessels/attachmentsTab/VesselAttachmentsContainer";

function VesselDetails({ vesselItem, toggleFullScreen }) {
  const isReadOnly = () => {
    const { currentCollection, isSync } = UIStore.getState();
    const { currentUser } = UserStore.getState();
    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  };
  const context = useContext(StoreContext);
  const [activeTab, setActiveTab] = useState('tab1');
  const [readOnly, setReadOnly] = useState(isReadOnly());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    context.vesselDetailsStore.convertVesselToModel(vesselItem);
    setReadOnly(isReadOnly());
  }, [vesselItem]);

  const handleSubmit = (vesselItem) => {
    const mobXItem = context.vesselDetailsStore.getVessel(vesselItem.id);
    vesselItem.adoptPropsFromMobXModel(mobXItem);

    if (vesselItem.is_new) {
      DetailActions.close(vesselItem, true);
      ElementActions.createVessel(vesselItem);
    } else {
      ElementActions.updateVessel(vesselItem);
    }
    mobXItem.markChanged(false);
  };

  const handleClose = (vesselItem) => {
    const { vesselDetailsStore } = context;
    const mobXItem = vesselDetailsStore.getVessel(vesselItem.id);

    if (!mobXItem.changed || window.confirm('Unsaved data will be lost. Close sample?')) {
      vesselDetailsStore.removeVesselFromStore(vesselItem.id);
      DetailActions.close(vesselItem, true);
    }
  };

  const handleTabChange = (eventKey) => {
    setActiveTab(eventKey);
  };

  const renderEnlargenButton = () => (
    <Button
      variant="info"
      size="xxsm"
      onClick={toggleFullScreen}
    >
      <i className="fa fa-expand" />
    </Button>
  );

  const renderSaveButton = (closeAfterClick = false) => {
    const { vesselDetailsStore } = context;
    const mobXItem = vesselDetailsStore.getVessel(vesselItem.id);
    const disabled = !mobXItem || mobXItem.isDuplicateName || !mobXItem.changed;

    const action = closeAfterClick
      ? () => { handleSubmit(vesselItem); DetailActions.close(vesselItem, true); }
      : () => { handleSubmit(vesselItem); };

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
        <Button
          disabled={disabled}
          variant="warning"
          size="xxsm"
          onClick={action}
        >
          {icons}
        </Button>
      </OverlayTrigger>
    );
  };

  const renderCloseHeaderButton = () => (
    <Button
      variant="danger"
      size="xxsm"
      onClick={() => { handleClose(vesselItem); }}
    >
      <i className="fa fa-times" />
    </Button>
  );

  const renderSubmitButton = () => {
    const { vesselDetailsStore } = context;
    const mobXItem = vesselDetailsStore.getVessel(vesselItem.id);
    const disabled = !mobXItem || mobXItem.isDuplicateName || !mobXItem.changed;
    const buttonText = vesselItem.is_new ? 'Create' : 'Save';

    return (
      <Button
        variant="warning"
        disabled={disabled}
        onClick={() => { handleSubmit(vesselItem); }}
      >
        {buttonText}
      </Button>
    );
  };

  if (!vesselItem) return null;

  const renderHeaderContent = () => (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex gap-2">
        <span>
          <i className="icon-vessel me-1" />
          {vesselItem.short_label}
        </span>
        <ElementCollectionLabels
          className="collection-label"
          element={vesselItem}
          key={vesselItem.id}
          placement="right"
        />
      </div>
      <div className="d-flex gap-1">
        {renderSaveButton(true)}
        {renderSaveButton()}
        {renderEnlargenButton()}
        <ConfirmClose el={vesselItem} />
      </div>
    </div>
  );

  return (
    <Card className="detail-card">
      <Card.Header>
        {renderHeaderContent()}
      </Card.Header>
      <Card.Body>
        <div className="tabs-container--with-borders">
          <Tabs activeKey={activeTab} onSelect={handleTabChange} id="vessel-details-tab">
            <Tab eventKey="tab1" title="Properties" key="tab1">
              <VesselProperties item={vesselItem} readOnly={readOnly} />
            </Tab>
            <Tab eventKey="tab2" title="Attachments" key="tab2">
              <VesselAttachmentsContainer item={vesselItem} />
            </Tab>
          </Tabs>
        </div>
        <ButtonToolbar className="d-flex gap-1">
          <Button variant="primary" onClick={() => { handleClose(vesselItem); }}>
            Close
          </Button>
          {renderSubmitButton()}
        </ButtonToolbar>
      </Card.Body>
    </Card>
  );
}

VesselDetails.propTypes = {
  vesselItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    itemName: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    short_label: PropTypes.string.isRequired,
    is_new: PropTypes.bool.isRequired,
  }).isRequired,
  toggleFullScreen: PropTypes.func.isRequired
};

export default observer(VesselDetails);
