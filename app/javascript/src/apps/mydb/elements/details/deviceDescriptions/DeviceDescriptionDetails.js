import React, { useState, useEffect, useContext } from 'react';
import {
  Button, Tabs, Tab, Tooltip, OverlayTrigger, Card
} from 'react-bootstrap';

import PropertiesForm from './propertiesTab/PropertiesForm';
import DetailsForm from './detailsTab/DetailsForm';
import AnalysesContainer from './analysesTab/AnalysesContainer';
import AttachmentForm from './attachmentsTab/AttachmentForm';
import MaintenanceForm from './maintenanceTab/MaintenanceForm';

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

const DeviceDescriptionDetails = () => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;
  deviceDescriptionsStore.setKeyPrefix('deviceDescription');

  const { currentCollection, isSync } = UIStore.getState();
  const { currentUser } = UserStore.getState();

  const [visibleTabs, setVisibleTabs] = useState(Immutable.List());

  const submitLabel = deviceDescription.isNew ? 'Create' : 'Save';
  let tabContents = [];

  useEffect(() => {
    if (MatrixCheck(currentUser.matrix, commentActivation) && !deviceDescription.isNew) {
      CommentActions.fetchComments(deviceDescription);
    }
  }, []);

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
    return deviceDescription.isNew && index !== 0 ? true : false;
  }

  visibleTabs.forEach((key, i) => {
    tabContents.push(
      <Tab eventKey={key} title={tabTitles[key]} key={`${key}_${deviceDescription.id}`} disabled={disabled(i)}>
        {
          !deviceDescription.isNew &&
          <CommentSection section={`device_description_${key}`} element={deviceDescription} />
        }
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
    deviceDescriptionsStore.setActiveTabKey(key);
  }

  const handleSubmit = () => {
    LoadingActions.start();
    if (deviceDescription.is_new) {
      DetailActions.close(deviceDescription, true);
      ElementActions.createDeviceDescription(deviceDescription);
    } else {
      ElementActions.updateDeviceDescription(deviceDescription);
    }
    deviceDescriptionsStore.setCurrentDeviceDescriptionIdToSave(`${deviceDescription.id}`);
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
      <Button
        variant="info"
        disabled={!deviceDescriptionIsValid()}
        onClick={() => handleExportAnalyses()}
      >
        Download Analysis
        {deviceDescriptionsStore.analysis_start_export && <i className="fa fa-spin fa-spinner ms-1" />}
      </Button>
    );
  }

  const deviceDescriptionHeader = () => {
    const titleTooltip = formatTimeStampsOfElement(deviceDescription || {});
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="deviceDescriptionDates">{titleTooltip}</Tooltip>}>
            <span>
              <i className="icon-device_description me-1" />
              {deviceDescription.name}
            </span>
          </OverlayTrigger>
          <ElementCollectionLabels element={deviceDescription} placement="right" />
          <HeaderCommentSection element={deviceDescription} />
        </div>
        <div className="d-flex align-items-center gap-1">
          <PrintCodeButton element={deviceDescription} />
          {!deviceDescription.isNew &&
            <OpenCalendarButton isPanelHeader eventableId={deviceDescription.id} eventableType="DeviceDescription" />}
          {deviceDescription.can_copy && !deviceDescription.isNew && (
            <CopyElementModal
              element={deviceDescription}
              defCol={defCol}
            />
          )}
          {deviceDescription.isEdited && (
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="saveDeviceDescription">Save device description</Tooltip>}
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
          <ConfirmClose el={deviceDescription} />
        </div>
      </div>
    );
  }

  return (
    <Card className={"detail-card" + (deviceDescription.isPendingToSave ? " detail-card--unsaved" : "")}>
      <Card.Header>
        {deviceDescriptionHeader()}
      </Card.Header>
      <Card.Body>
        <div className="tabs-container--with-borders">
          <ElementDetailSortTab
            type="device_description"
            availableTabs={Object.keys(tabContentComponents)}
            tabTitles={tabTitles}
            onTabPositionChanged={onTabPositionChanged}
          />
          <Tabs
            activeKey={deviceDescriptionsStore.active_tab_key}
            onSelect={key => handleTabChange(key)}
            id="deviceDescriptionDetailsTab"
            unmountOnExit
          >
            {tabContents}
          </Tabs>
        </div>
        <CommentModal element={deviceDescription} />
      </Card.Body>
      <Card.Footer>
        <Button variant="primary" onClick={() => DetailActions.close(deviceDescription)}>
          Close
        </Button>
        <Button variant="warning" disabled={!deviceDescriptionIsValid()} onClick={() => handleSubmit()}>
          {submitLabel}
        </Button>
        {downloadAnalysisButton()}
      </Card.Footer>
    </Card>
  );
}

export default observer(DeviceDescriptionDetails);
