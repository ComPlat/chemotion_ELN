import React, {
  useState, useEffect, useContext, useRef
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, Form, Tabs, Tab, ListGroupItem
} from 'react-bootstrap';

import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import PropertiesForm
  from 'src/apps/mydb/elements/details/sequenceBasedMacromoleculeSamples/propertiesTab/PropertiesForm';
import AnalysesContainer
  from 'src/apps/mydb/elements/details/sequenceBasedMacromoleculeSamples/analysesTab/AnalysesContainer';
import AttachmentForm
  from 'src/apps/mydb/elements/details/sequenceBasedMacromoleculeSamples/attachmentsTab/AttachmentForm';
import ConflictModal
  from 'src/apps/mydb/elements/details/sequenceBasedMacromoleculeSamples/ConflictModal';
import { collectionHasPermission } from 'src/utilities/collectionUtilities';
import Immutable from 'immutable';
import { set } from 'lodash';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import ChemicalTab from 'src/components/chemicals/ChemicalTab';
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';

// Module-level slot: holds chemical data to be created after a new SBMM sample is
// persisted (survives the component unmount/remount caused by navigateToNewElement).
let _sbmmPendingChemicalCreate = null;

function SequenceBasedMacromoleculeSampleDetails({ openedFromCollectionId }) {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const collectionsStore = useContext(StoreContext).collections;
  const sbmmSample = sbmmStore.sequence_based_macromolecule_sample;

  const { currentCollection } = UIStore.getState();
  const { currentUser } = UserStore.getState();

  const [visibleTabs, setVisibleTabs] = useState(Immutable.List());
  const submitLabel = sbmmSample.isNew ? 'Create' : 'Save';
  const tabContents = [];
  const alertRef = useRef();
  const chemicalTabRef = useRef();
  const hasError = Object.keys(sbmmSample.errors).length >= 1;

  useEffect(() => {
    if (sbmmSample?.id && !sbmmSample.isNew && MatrixCheck(currentUser.matrix, commentActivation)) {
      CommentActions.fetchComments(sbmmSample);
    }
    // After a new SBMM is created, carry out any pending chemical create that
    // was snapshotted before the old instance was closed.
    if (_sbmmPendingChemicalCreate && sbmmSample?.id && !sbmmSample.isNew) {
      const snapshot = _sbmmPendingChemicalCreate;
      _sbmmPendingChemicalCreate = null;
      ChemicalFetcher.create({
        sequence_based_macromolecule_sample_id: sbmmSample.id,
        ...snapshot,
      }).then(() => {
        // Re-fetch chemical so ChemicalTab renders the newly-created record
        // without requiring a page refresh.
        chemicalTabRef.current?.fetchChemical(sbmmSample);
      }).catch((err) => console.log(err));
    }
  }, []);

  useEffect(() => {
    const items = document.getElementsByClassName('border-danger');

    if (hasError && Object.keys(items).length >= 1 && items.item(0) !== null) {
      setTimeout(() => {
        items.item(0).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    } else if (hasError && alertRef.current !== undefined) {
      setTimeout(() => {
        document.getElementById('sbmm-error-alert').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    }
  }, [alertRef.current]);

  const sbmmInventoryTab = (eventKey) => (
    <Tab eventKey={eventKey} title="Inventory" key={`Inventory${sbmmSample.id.toString()}`} unmountOnExit={false}>
      {
        !sbmmSample.isNew && <CommentSection section="sbmm_sample_inventory" element={sbmmSample} />
      }
      <ListGroupItem>
        <ChemicalTab
          ref={chemicalTabRef}
          sample={sbmmSample}
          type="SBMM"
          setSaveInventory={(v) => sbmmStore.setSaveInventoryAction(v)}
          saveInventory={sbmmStore.saveInventoryAction}
          editChemical={sbmmStore.editChemical}
          key={`ChemicalTab${sbmmSample.id.toString()}`}
        />
      </ListGroupItem>
    </Tab>
  );

  const tabContentComponents = {
    properties: PropertiesForm,
    analyses: AnalysesContainer,
    attachments: AttachmentForm,
    inventory: ChemicalTab,
  };

  const tabTitles = {
    properties: 'Properties',
    analyses: 'Analyses',
    attachments: 'Attachment',
    inventory: 'Inventory',
  };

  const isReadOnly = () => !collectionHasPermission(currentCollection, 0);

  const disabled = (index) => (!!(sbmmSample.isNew && index !== 0));

  visibleTabs.forEach((key, i) => {
    const title = tabTitles[key];
    if (key === 'inventory') {
      tabContents.push(sbmmInventoryTab(key));
    } else {
      tabContents.push(
        <Tab eventKey={key} title={title} key={`${key}_${sbmmSample.id}`} disabled={disabled(i)}>
          {
            !sbmmSample.isNew
            && <CommentSection section={`sequence_based_macromolecule_sample_${key}`} element={sbmmSample} />
          }
          {React.createElement(tabContentComponents[key], {
            key: `${sbmmSample.id}-${key}`,
            readonly: isReadOnly()
          })}
        </Tab>
      );
    }
  });

  const errorMessage = () => {
    const { conflict } = sbmmSample.errors;
    const reason = conflict
      ? conflict.message
      : `This element cannot be ${submitLabel.toLowerCase()}d because not all fields are filled in correctly.`;
    return (
      <>
        {reason}
        {(conflict && conflict.type === 'SbmmUpdateNotAllowed') && (
          <Button
            variant="link"
            className="py-0 px-2"
            onClick={() => sbmmStore.openConflictModal(conflict.original_sbmm, conflict.requested_changes)}
          >
            Options
          </Button>
        )}
      </>
    );
  };

  const onTabPositionChanged = (visible) => {
    setVisibleTabs(visible);
  };

  const updateInventoryTabInCollection = (inventoryOrder) => {
    if (!currentCollection || currentCollection.is_sync_to_me) return;

    const sbmmLayout = currentCollection?.tabs_segment?.sequence_based_macromolecule_sample;
    const userProfile = UserStore.getState().profile;
    const baseLayout = sbmmLayout
      || userProfile?.data?.layout_detail_sequence_based_macromolecule_sample;

    if (!baseLayout) return;

    const updatedLayout = { ...baseLayout, inventory: inventoryOrder };

    const tabSegment = { ...currentCollection?.tabs_segment, sequence_based_macromolecule_sample: updatedLayout };
    collectionsStore.updateCollection(currentCollection, tabSegment);

    if (!userProfile) return;
    set(userProfile, 'data.layout_detail_sequence_based_macromolecule_sample', updatedLayout);
    UserActions.updateUserProfile(userProfile);
  };

  const hideInventoryTabInCollection = () => {
    const sbmmLayout = currentCollection?.tabs_segment?.sequence_based_macromolecule_sample;
    const baseLayout = sbmmLayout
      || UserStore.getState().profile?.data?.layout_detail_sequence_based_macromolecule_sample;

    if (!baseLayout || baseLayout.inventory === undefined) return;

    updateInventoryTabInCollection(-Math.abs(baseLayout.inventory));
  };

  const persistInventoryTabInCollection = () => {
    const sbmmLayout = currentCollection?.tabs_segment?.sequence_based_macromolecule_sample;
    const baseLayout = sbmmLayout
      || UserStore.getState().profile?.data?.layout_detail_sequence_based_macromolecule_sample;

    // Already visible — nothing to do
    if (baseLayout?.inventory > 0) return;

    if (!baseLayout) return;

    const maxOrder = Math.max(0, ...Object.values(baseLayout).map((v) => Math.abs(v)));
    updateInventoryTabInCollection(maxOrder + 1);
  };

  const handleInventorySample = (e) => {
    const { checked } = e.target;
    sbmmStore.changeSequenceBasedMacromoleculeSample('inventory_sample', checked);

    if (checked) {
      if (!visibleTabs.includes('inventory')) {
        setVisibleTabs(visibleTabs.push('inventory'));
      }
      persistInventoryTabInCollection();
    } else {
      setVisibleTabs(visibleTabs.filter((v) => v !== 'inventory'));
      if (sbmmStore.active_tab_key === 'inventory') {
        sbmmStore.setActiveTabKey('properties');
      }
      hideInventoryTabInCollection();
    }
  };

  const handleTabChange = (key) => {
    sbmmStore.setActiveTabKey(key);
  };

  const handleSubmit = () => {
    sbmmStore.saveSample(sbmmSample);
  };

  // Chain-save: save SBMM sample first (if changed and valid), then chemical (if edited)
  const handleChainSave = () => {
    const sbmmHasChanges = sbmmSample.isEdited || sbmmSample.changed;
    // Snapshot chemical data BEFORE handleSubmit closes this instance.
    // For new SBMM samples, navigateToNewElement mounts a fresh component;
    // the useEffect on mount will consume _sbmmPendingChemicalCreate.
    if (sbmmSample.isNew && sbmmStore.isChemicalEdited) {
      _sbmmPendingChemicalCreate = chemicalTabRef.current?.getChemicalSnapshot() ?? null;
    }
    if (sbmmHasChanges && Object.keys(sbmmSample.errors).length < 1) {
      handleSubmit();
    }
    if (sbmmStore.isChemicalEdited && !sbmmSample.isNew) {
      handleSubmitChemical();
    }
  };

  const handleExportAnalyses = () => {
    sbmmStore.toggleAnalysisStartExport();
    AttachmentFetcher.downloadZipBySequenceBaseMacromoleculeSample(sbmmSample.id)
      .then(() => { sbmmStore.toggleAnalysisStartExport(); })
      .catch((exportError) => { console.log(exportError); });
  };

  const downloadAnalysisButton = () => {
    const hasNoAnalysis = sbmmSample.analyses?.length === 0 || sbmmSample.analyses?.length === undefined;
    if (sbmmSample.isNew || hasNoAnalysis) { return null; }
    return (
      <Button
        variant="info"
        onClick={() => handleExportAnalyses()}
      >
        Download Analysis
        {sbmmStore.analysis_start_export && <i className="fa fa-spin fa-spinner ms-1" />}
      </Button>
    );
  };

  const uniprotLogo = () => {
    const parentLink = sbmmSample.sequence_based_macromolecule.parent?.link_uniprot;
    const linkUniprot = parentLink || sbmmSample.sequence_based_macromolecule?.link_uniprot;
    if (linkUniprot) {
      return (
        <a href={linkUniprot} className="pe-auto" target="_blank" rel="noreferrer">
          <img src="/logos/uniprot-logo.svg" className="uniprot-logo" alt="Uniprot" />
        </a>
      );
    }
    return <img src="/logos/uniprot-logo-gray.svg" className="uniprot-logo-gray" alt="Uniprot" />;
  };

  // Handler for chemical save
  const handleSubmitChemical = () => {
    // Set saveInventoryAction to true, which triggers ChemicalTab to save
    sbmmStore.setSaveInventoryAction(true);
  };

  const hasSampleChanges = sbmmSample.isEdited || sbmmSample.changed;
  const isValid = Object.keys(sbmmSample.errors).length < 1;
  const canSaveSample = hasSampleChanges && isValid;
  const canSaveChemical = sbmmStore.isChemicalEdited;

  const headerToolbar = (
    <Form.Check
      type="checkbox"
      id="sbmm-sample-inventory-header"
      className="mx-2 sample-inventory-header"
      checked={sbmmSample.inventory_sample || false}
      onChange={(e) => handleInventorySample(e)}
      label="Inventory"
    />
  );

  const titleAppendix = uniprotLogo();

  const isPendingToSave = sbmmSample.isPendingToSave || sbmmStore.isChemicalEdited;

  return (
    <ElementDetailCard
      element={sbmmSample}
      isPendingToSave={isPendingToSave}
      title={`${sbmmSample.title()}${sbmmSample.sbmmShortLabelForHeader(true)}`}
      titleTooltip={formatTimeStampsOfElement(sbmmSample || {})}
      titleAppendix={titleAppendix}
      headerToolbar={headerToolbar}
      footerToolbar={downloadAnalysisButton()}
      onSave={handleChainSave}
      saveDisabled={!canSaveSample && !canSaveChemical}
      showPrintCode
      showCalendar
    >
      <div className="tabs-container--with-borders">
        <ElementDetailSortTab
          type="sequence_based_macromolecule_sample"
          availableTabs={Object.keys(tabContentComponents)}
          tabTitles={tabTitles}
          onTabPositionChanged={onTabPositionChanged}
          addInventoryTab={sbmmSample.inventory_sample || false}
          openedFromCollectionId={openedFromCollectionId}
        />
        <Tabs
          activeKey={sbmmStore.active_tab_key}
          onSelect={(key) => handleTabChange(key)}
          id="sbmmSampleSampleDetailsTab"
          unmountOnExit
          className="has-config-overlay"
        >
          {tabContents}
        </Tabs>
      </div>
      <CommentModal element={sbmmSample} />
      {
        (hasError || sbmmSample.errors?.structure_file) && (
          <Alert ref={alertRef} id="sbmm-error-alert" variant="danger" className="mt-3">{errorMessage()}</Alert>
        )
      }
      {sbmmStore.show_conflict_modal && <ConflictModal />}
    </ElementDetailCard>
  );
}

SequenceBasedMacromoleculeSampleDetails.propTypes = {
  openedFromCollectionId: PropTypes.number,
};

SequenceBasedMacromoleculeSampleDetails.defaultProps = {
  openedFromCollectionId: null,
};

export default observer(SequenceBasedMacromoleculeSampleDetails);
