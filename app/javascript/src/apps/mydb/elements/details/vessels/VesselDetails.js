import React, { useState, useContext, useEffect } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { Button, Tabs, Tab } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import { detailFooterButton } from 'src/apps/mydb/elements/details/DetailCardButton';
import { observer } from 'mobx-react';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import CollectionUtils from 'src/models/collection/CollectionUtils';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';

function VesselDetails({ vesselItem }) {
  if (!vesselItem) {
    return null; // Render nothing if no vesselItem
  }
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

  useEffect(() => {
    context.vesselDetailsStore.convertVesselToModel(vesselItem);
    setReadOnly(isReadOnly());
  }, [vesselItem]);

  const handleSubmit = () => {
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

  const handleClose = () => {
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

  if (!vesselItem) return null;

  const mobXItem = context.vesselDetailsStore.getVessel(vesselItem.id);
  const isPendingToSave = !!mobXItem?.changed;
  const isSubmitDisabled = !mobXItem || mobXItem.isDuplicateName || !mobXItem.changed;
  const submitLabel = vesselItem.is_new ? 'Create' : 'Save';
  const titleAppendix = (
    <ElementCollectionLabels
      className="collection-label"
      element={vesselItem}
      key={vesselItem.id}
      placement="right"
    />
  );
  const footerToolbar = (
    <>
      <Button variant="ghost" onClick={handleClose}>
        Close
      </Button>
      {detailFooterButton({
        label: submitLabel,
        iconClass: 'fa fa-floppy-o',
        variant: 'warning',
        disabled: isSubmitDisabled,
        onClick: handleSubmit,
      })}
    </>
  );

  return (
    <DetailCard
      title={vesselItem.short_label}
      titleIcon={<i className="icon-vessel" />}
      titleAppendix={titleAppendix}
      onClose={handleClose}
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
