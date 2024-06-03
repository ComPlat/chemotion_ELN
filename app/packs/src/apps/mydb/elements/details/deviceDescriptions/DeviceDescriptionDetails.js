import React, { useState, useContext } from 'react';
import {
  Panel, ButtonToolbar, Button, Tabs, Tab, Tooltip, OverlayTrigger
} from 'react-bootstrap';

import PropertiesForm from './propertiesTab/PropertiesForm';
import DetailsForm from './detailsTab/DetailsForm';
import AnalysesContainer from './analysesTab/AnalysesContainer';
import AttachmentForm from './attachmentsTab/AttachmentForm';
import MaintenanceForm from './maintenanceTab/MaintenanceForm';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentModal from 'src/components/common/CommentModal';
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

const DeviceDescriptionDetails = ({ toggleFullScreen }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;
  deviceDescriptionsStore.setKeyPrefix('deviceDescription');

  const { currentCollection, isSync } = UIStore.getState();
  const { currentUser } = UserStore.getState();

  const [activeTab, setActiveTab] = useState('properties'); // state from store
  const [visibleTabs, setVisibleTabs] = useState(Immutable.List());

  const submitLabel = deviceDescription.isNew ? 'Create' : 'Save';
  let tabContents = [];

  const tabContentComponents = {
    properties: PropertiesForm,
    detail: DetailsForm,
    analyses: AnalysesContainer,
    attachments: AttachmentForm,
    maintenance: MaintenanceForm,
  };

  const tabTitles = {
    properties: 'Properties',
    detail: 'Details',
    analyses: 'Analyses',
    attachments: 'Attachment',
    maintenance: 'Maintenance',
  };

  const isReadOnly = () => {
    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  }

  const disabled = (index) => {
    return deviceDescription.id.toString().length < 30 || index === 0 ? false : true;
  }

  visibleTabs.forEach((key, i) => {
    let title = key.charAt(0).toUpperCase() + key.slice(1);

    tabContents.push(
      <Tab eventKey={key} title={title} key={`${key}_${deviceDescription.id}`} disabled={disabled(i)}>
        {React.createElement(tabContentComponents[key], {
          key: `${deviceDescription.id}-${key}`,
          readonly: isReadOnly()
        })}
      </Tab>
    );
  });

  const onTabPositionChanged = (visible) => {
    setVisibleTabs(visible);
  }

  const handleTabChange = (key) => {
    setActiveTab(key);
  }

  const handleSubmit = () => {
    LoadingActions.start();
    if (deviceDescription.is_new) {
      DetailActions.close(deviceDescription, true);
      ElementActions.createDeviceDescription(deviceDescription);
    } else {
      ElementActions.updateDeviceDescription(deviceDescription);
    }
  }

  const deviceDescriptionIsValid = () => {
    // TODO: validation
    return true;
  }

  const handleExportAnalyses = () => {
    deviceDescriptionsStore.toggleAnalysisStartExport();
    AttachmentFetcher.downloadZipByDeviceDescription(deviceDescription.id)
      .then(() => { deviceDescriptionsStore.toggleAnalysisStartExport(); })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  const downloadAnalysisButton = () => {
    const hasNoAnalysis = deviceDescription.analyses?.length === 0 || deviceDescription.analyses?.length === undefined;
    if (deviceDescription.isNew || hasNoAnalysis) { return null; }

    return (
      <Button bsStyle="info" disabled={!deviceDescriptionIsValid()} onClick={() => handleExportAnalyses()}>
        Download Analysis
        {' '}
        {deviceDescriptionsStore.analysis_start_export ? (
          <span>
            <i className="fa fa-spin fa-spinner" />
          </span>
        ) : null}
      </Button>
    );
  }

  const deviceDescriptionHeader = () => {
    const saveBtnDisplay = deviceDescription.isEdited ? '' : 'none';
    const datetp = formatTimeStampsOfElement(deviceDescription || {});
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    const copyButton = (deviceDescription.can_copy && !deviceDescription.isNew) ? (
      <CopyElementModal
        element={deviceDescription}
        defCol={defCol}
      />
    ) : null;

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="screenDatesx">{datetp}</Tooltip>}>
          <span>
            <i className="icon-device_description" />
            &nbsp; <span>{deviceDescription.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={deviceDescription} placement="right" />
        <HeaderCommentSection element={deviceDescription} />
        <ConfirmClose el={deviceDescription} />
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="saveDeviceDescription">Save device description</Tooltip>}
        >
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => handleSubmit()}
            style={{ display: saveBtnDisplay }}
          >
            <i className="fa fa-floppy-o " />
          </Button>
        </OverlayTrigger>
        {copyButton}
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => toggleFullScreen()}>
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        <PrintCodeButton element={deviceDescription} />
        {deviceDescription.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={deviceDescription.id} eventableType="DeviceDescription" />}
      </div>
    );
  }

  return (
    <Panel bsStyle={deviceDescription.isPendingToSave ? 'info' : 'primary'} className="eln-panel-detail">
      <Panel.Heading>{deviceDescriptionHeader()}</Panel.Heading>
      <Panel.Body>
        <ElementDetailSortTab
          type="device_description"
          availableTabs={Object.keys(tabContentComponents)}
          tabTitles={tabTitles}
          onTabPositionChanged={onTabPositionChanged}
        />
        <Tabs activeKey={activeTab} onSelect={key => handleTabChange(key)} id="deviceDescriptionDetailsTab">
          {tabContents}
        </Tabs>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => DetailActions.close(deviceDescription)}>
            Close
          </Button>
          <Button bsStyle="warning" disabled={!deviceDescriptionIsValid()} onClick={() => handleSubmit()}>
            {submitLabel}
          </Button>
          {downloadAnalysisButton()}
        </ButtonToolbar>
        <CommentModal element={deviceDescription} />
      </Panel.Body>
    </Panel>
  );
}

export default observer(DeviceDescriptionDetails);
