import React, { useState, useEffect, useContext } from 'react';
import {
  Button, Tabs, Tab, Tooltip, OverlayTrigger, Card
} from 'react-bootstrap';

import PropertiesForm from './propertiesTab/PropertiesForm';
import AnalysesContainer from './analysesTab/AnalysesContainer';
import AttachmentForm from './attachmentsTab/AttachmentForm';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ConfirmClose from 'src/components/common/ConfirmClose';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import CopyElementModal from 'src/components/common/CopyElementModal';
import Immutable from 'immutable';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import CollectionUtils from 'src/models/collection/CollectionUtils';

const SequenceBasedMacromoleculeSampleDetails = () => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const sbmmSample = sbmmStore.sequence_based_macromolecule_sample;

  const { currentCollection, isSync } = UIStore.getState();
  const { currentUser } = UserStore.getState();

  const [visibleTabs, setVisibleTabs] = useState(Immutable.List());

  const submitLabel = sbmmSample.isNew ? 'Create' : 'Save';
  let tabContents = [];

  useEffect(() => {
    if (sbmmSample?.id && !sbmmSample.isNew && MatrixCheck(currentUser.matrix, commentActivation)) {
      CommentActions.fetchComments(sbmmSample);
    }
  }, []);

  useEffect(() => {
    const items = document.getElementsByClassName('border-danger');
    if (Object.keys(sbmmSample.errors).length >= 1 && Object.keys(items).length >= 1) {
      document.getElementById('detail-body').scrollTo({
        top: items[0].offsetTop,
        behavior: 'smooth'
      });
    }
  }, [Object.keys(sbmmSample.errors).length]);

  const tabContentComponents = {
    properties: PropertiesForm,
    analyses: AnalysesContainer,
    attachments: AttachmentForm,
  };

  const tabTitles = {
    properties: 'Properties',
    analyses: 'Analyses',
    attachments: 'Attachment',
  };

  const isReadOnly = () => {
    if (!currentCollection) { return false; }

    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  }

  const disabled = (index) => {
    return sbmmSample.isNew && index !== 0 ? true : false;
  }

  visibleTabs.forEach((key, i) => {
    let title = tabTitles[key];
  
    tabContents.push(
      <Tab eventKey={key} title={title} key={`${key}_${sbmmSample.id}`} disabled={disabled(i)}>
        {
          !sbmmSample.isNew &&
          <CommentSection section={`sequence_based_macromolecule_sample_${key}`} element={sbmmSample} />
        }
        {React.createElement(tabContentComponents[key], {
          key: `${sbmmSample.id}-${key}`,
          readonly: isReadOnly()
        })}
      </Tab>
    );
  });

  const onTabPositionChanged = (visible) => {
    setVisibleTabs(visible);
  }

  const handleTabChange = (key) => {
    sbmmStore.setActiveTabKey(key);
  }

  const handleSubmit = () => {
    if (sbmmStore.hasValidFields()) {
      LoadingActions.start();
      if (sbmmSample.is_new) {
        DetailActions.close(sbmmSample, true);
        ElementActions.createSequenceBasedMacromoleculeSample(sbmmSample);
      } else {
        ElementActions.updateSequenceBasedMacromoleculeSample(sbmmSample);
        sbmmStore.setUpdatedSequenceBasedMacromoleculeSampleId(sbmmSample.id);
      }
    }
  }

  const handleExportAnalyses = () => {
    sbmmStore.toggleAnalysisStartExport();
    AttachmentFetcher.downloadZipBySequenceBaseMacromoleculeSample(sbmmSample.id)
      .then(() => { sbmmStore.toggleAnalysisStartExport(); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

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
  }

  const uniprotLogo = () => {
    const linkUniprot =
      sbmmSample.sequence_based_macromolecule.parent?.link_uniprot || sbmmSample.sequence_based_macromolecule?.link_uniprot;
    if (!linkUniprot) { return null; }

    return (
      <a href={linkUniprot} className="pe-auto" target="_blank">
        <img src="/images/wild_card/uniprot-logo.svg" className="uniprot-logo-white" />
      </a>
    );
  }

  const sbmmSampleHeader = () => {
    const titleTooltip = formatTimeStampsOfElement(sbmmSample || {});
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="sbmmSampleDates">{titleTooltip}</Tooltip>}
          >
            <span>
              <i className="icon-sequence_based_macromolecule me-1" />
              {sbmmSample.name}
            </span>
          </OverlayTrigger>
          {
            !sbmmSample.isNew && (
              <ElementCollectionLabels element={sbmmSample} placement="right" />
            )
          }
          <HeaderCommentSection element={sbmmSample} />
          {uniprotLogo()}
        </div>
        <div className="d-flex align-items-center gap-1">
          <PrintCodeButton element={sbmmSample} />
          {!sbmmSample.isNew &&
            <OpenCalendarButton
              isPanelHeader
              eventableId={sbmmSample.id}
              eventableType="SequenceBasedMacromoleculeSample"
            />}
          {sbmmSample.can_copy && !sbmmSample.isNew && (
            <CopyElementModal
              element={sbmmSample}
              defCol={defCol}
            />
          )}
          {sbmmSample.isEdited && (
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="saveSequenceBasedMacromolecule">Save sequence based macromolecule</Tooltip>}
            >
              <Button
                variant="warning"
                size="xxsm"
                onClick={() => handleSubmit()}
              >
                <i className="fa fa-floppy-o " />
              </Button>
            </OverlayTrigger>
          )}
          <ConfirmClose el={sbmmSample} />
        </div>
      </div>
    );
  }

  return (
    <Card className={"detail-card" + (sbmmSample.isPendingToSave ? " detail-card--unsaved" : "")}>
      <Card.Header>
        {sbmmSampleHeader()}
      </Card.Header>
      <Card.Body style={{ minHeight: '500px' }}>
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="sequence_based_macromolecule_sample"
            availableTabs={Object.keys(tabContentComponents)}
            tabTitles={tabTitles}
            onTabPositionChanged={onTabPositionChanged}
          />
          <Tabs
            activeKey={sbmmStore.active_tab_key}
            onSelect={key => handleTabChange(key)}
            id="sbmmSampleSampleDetailsTab"
            unmountOnExit
          >
            {tabContents}
          </Tabs>
        </div>
        <CommentModal element={sbmmSample} />
      </Card.Body>
      <Card.Footer>
        <div className="gap-2">
          <Button variant="primary" onClick={() => DetailActions.close(deviceDescription)}>
            Close
          </Button>
          <Button variant="warning" disabled={!deviceDescriptionIsValid()} onClick={() => handleSubmit()}>
            {submitLabel}
          </Button>
          {downloadAnalysisButton()}
        </div>
        {
          Object.keys(sbmmSample.errors).length >= 1 && (
            <div className="mt-2 text-danger">
              {`This element cannot be ${submitLabel.toLowerCase()}d because not all fields are filled in correctly`}
            </div>
          )
        }
      </Card.Footer>
    </Card>
  );
}

export default observer(SequenceBasedMacromoleculeSampleDetails);
