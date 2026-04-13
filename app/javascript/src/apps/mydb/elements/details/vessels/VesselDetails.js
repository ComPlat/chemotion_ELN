import React, { useState, useContext, useEffect } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Button, Tabs, Tab, Overlay, Tooltip, ButtonToolbar
} from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import { detailHeaderButton, detailFooterButton } from 'src/apps/mydb/elements/details/DetailCardButton';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import { collectionHasPermission } from 'src/utilities/collectionUtilities';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';

function VesselDetails({ vesselItem }) {
  if (!vesselItem) {
    return null; // Render nothing if no vesselItem
  }
  const isReadOnly = () => {
    const { currentCollection } = UIStore.getState();
    return !collectionHasPermission(currentCollection, 0);
  };
  const context = useContext(StoreContext);
  const [activeTab, setActiveTab] = useState('tab1');
  const [readOnly, setReadOnly] = useState(isReadOnly());
  const [showCloseOverlay, setShowCloseOverlay] = useState(false);
  const [closeOverlayTarget, setCloseOverlayTarget] = useState(null);
  const [closeOverlayPlacement, setCloseOverlayPlacement] = useState('bottom');

  const mobXItem = context.vesselDetailsStore.getVessel(vesselItem.id);
  const isPendingToSave = !!mobXItem?.changed;
  const isSubmitDisabled = !mobXItem || mobXItem.isDuplicateName || !mobXItem.changed;
  const submitLabel = vesselItem.is_new ? 'Create' : 'Save';

  useEffect(() => {
    context.vesselDetailsStore.convertVesselToModel(vesselItem);
    setReadOnly(isReadOnly());
  }, [vesselItem]);

  const handleSubmit = () => {
    vesselItem.adoptPropsFromMobXModel(mobXItem);

    if (vesselItem.is_new) {
      DetailActions.close(vesselItem, true);
      ElementActions.createVessel(vesselItem);
    } else {
      ElementActions.updateVessel(vesselItem);
    }
    mobXItem.markChanged(false);
  };

  const handleClose = () => {
    const { vesselDetailsStore } = context;

    if (!mobXItem.changed || window.confirm('Unsaved data will be lost. Close sample?')) {
      vesselDetailsStore.removeVesselFromStore(vesselItem.id);
      DetailActions.close(vesselItem, true);
    }
  };

  const handleSaveClose = () => {
    setShowCloseOverlay(false);
    handleSubmit();
    handleClose(true);
  };

  const requestClose = (event, forceClose = false, placement = 'bottom') => {
    if (mobXItem?.changed && !forceClose) {
      setCloseOverlayTarget(event?.currentTarget || null);
      setCloseOverlayPlacement(placement);
      setShowCloseOverlay(true);
      return;
    }
    handleClose(forceClose);
  };

  const handleTabChange = (eventKey) => {
    setActiveTab(eventKey);
  };

  if (!vesselItem) return null;

  const titleAppendix = (
    <ElementCollectionLabels
      className="collection-label"
      element={vesselItem}
      key={vesselItem.id}
      placement="right"
    />
  );

  const headerToolbar = !isSubmitDisabled ? (
    <div className="d-flex gap-1 align-items-center">
      {detailHeaderButton({
        label: `${submitLabel} and Close`,
        iconClass: 'fa fa-floppy-o combi-icon-close',
        onClick: handleSaveClose,
      })}
      {detailHeaderButton({
        label: submitLabel,
        iconClass: 'fa fa-floppy-o',
        variant: 'primary',
        onClick: handleSubmit,
      })}
    </div>
  ) : null;

  const footerToolbar = (
    <>
      <Button variant="ghost" onClick={(event) => requestClose(event, false, 'top')}>
        Close
      </Button>
      {detailFooterButton({
        label: submitLabel,
        iconClass: 'fa fa-floppy-o',
        variant: 'primary',
        disabled: isSubmitDisabled,
        onClick: handleSubmit,
      })}
    </>
  );

  const closeOverlay = (
    <Overlay
      target={closeOverlayTarget}
      show={showCloseOverlay}
      placement={closeOverlayPlacement}
      rootClose
      onHide={() => setShowCloseOverlay(false)}
    >
      <Tooltip id="vessel-detail-close-overlay">
        <div className="p2">
          You have unsaved changes. Save before closing?
          <ButtonToolbar className="justify-content-end mt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleClose(true)}
            >
              Discard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCloseOverlay(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveClose}
              disabled={isSubmitDisabled}
            >
              Save and Close
            </Button>
          </ButtonToolbar>
        </div>
      </Tooltip>
    </Overlay>
  );

  return (
    <DetailCard
      title={vesselItem.short_label}
      titleIcon={<i className="icon-vessel" />}
      titleAppendix={titleAppendix}
      onClose={(event) => requestClose(event, false, 'bottom')}
      headerToolbar={headerToolbar}
      footerToolbar={footerToolbar}
      className={isPendingToSave ? 'detail-card--unsaved' : null}
    >
      <div className="tabs-container--with-borders">
        <Tabs activeKey={activeTab} onSelect={handleTabChange} id="vessel-details-tab">
          <Tab eventKey="tab1" title="Properties" key="tab1">
            <VesselProperties item={vesselItem} readOnly={readOnly} />
          </Tab>
        </Tabs>
      </div>
      {closeOverlay}
    </DetailCard>
  );
}

VesselDetails.propTypes = {
  vesselItem: PropTypes.shape({
    id: PropTypes.string.isRequired,
    itemName: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    short_label: PropTypes.string.isRequired,
    is_new: PropTypes.bool.isRequired,
    adoptPropsFromMobXModel: PropTypes.func.isRequired,
  }).isRequired,
};

export default observer(VesselDetails);
