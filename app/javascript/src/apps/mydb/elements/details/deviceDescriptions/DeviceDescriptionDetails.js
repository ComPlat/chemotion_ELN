import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tabs, Tab
} from 'react-bootstrap';

import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import { List } from 'immutable';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { addAttachmentsFromFiles, setAttachmentDeleted, replaceAttachment } from 'src/utilities/attachmentUtils';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { collectionHasPermission } from 'src/utilities/collectionUtilities';
import PropertiesForm from 'src/apps/mydb/elements/details/deviceDescriptions/propertiesTab/PropertiesForm';
// eslint-disable-next-line import/no-named-as-default
import AttachmentTab
  from 'src/apps/mydb/elements/details/attachmentTab/AttachmentTab';
import AnalysesContainer from 'src/apps/mydb/elements/details/deviceDescriptions/analysesTab/AnalysesContainer';
import MaintenanceForm from 'src/apps/mydb/elements/details/deviceDescriptions/maintenanceTab/MaintenanceForm';
import DetailsForm from 'src/apps/mydb/elements/details/deviceDescriptions/detailsTab/DetailsForm';
// eslint-disable-next-line import/no-named-as-default
import VersionsTable from 'src/apps/mydb/elements/details/VersionsTable';

function DeviceDescriptionDetails({ openedFromCollectionId }) {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const deviceDescription = deviceDescriptionsStore.device_description;
  deviceDescriptionsStore.setKeyPrefix('deviceDescription');

  const { currentCollection } = UIStore.getState();
  const { currentUser } = UserStore.getState();

  const [visibleTabs, setVisibleTabs] = useState(List());
  const tabContents = [];

  useEffect(() => {
    if (MatrixCheck(currentUser.matrix, commentActivation) && !deviceDescription.isNew) {
      CommentActions.fetchComments(deviceDescription);
    }
  }, []);

  const versioningTable = () => (
    <VersionsTable
      type="device_descriptions"
      id={deviceDescription.id}
      element={deviceDescription}
      parent={deviceDescriptionsStore}
      isEdited={deviceDescription.changed}
    />
  );

  const tabContentComponents = {
    properties: PropertiesForm,
    detail: DetailsForm,
    analyses: AnalysesContainer,
    maintenance: MaintenanceForm,
    history: versioningTable,
  };

  const tabTitles = {
    properties: 'Properties',
    detail: 'Details',
    analyses: 'Analyses',
    attachments: 'Attachment',
    maintenance: 'Maintenance',
    history: 'History',
  };

  const availableTabs = ['properties', 'detail', 'analyses', 'attachments', 'maintenance', 'history'];

  const isReadOnly = () => !collectionHasPermission(currentCollection, 0);

  const disabled = (index) => (!!(deviceDescription.isNew && index !== 0));

  const handleAttachmentDrop = (files) => {
    deviceDescriptionsStore.changeDeviceDescription(
      'attachments',
      addAttachmentsFromFiles(deviceDescription.attachments, files)
    );
  };

  const handleAttachmentDelete = (attachment) => {
    deviceDescriptionsStore.changeDeviceDescription(
      'attachments',
      setAttachmentDeleted(deviceDescription.attachments, attachment, true)
    );
  };

  const handleAttachmentUndoDelete = (attachment) => {
    deviceDescriptionsStore.changeDeviceDescription(
      'attachments',
      setAttachmentDeleted(deviceDescription.attachments, attachment, false)
    );
  };

  const handleAttachmentEdit = (updated) => {
    deviceDescriptionsStore.changeDeviceDescription(
      'attachments',
      replaceAttachment(deviceDescription.attachments, updated)
    );
  };

  const deviceDescriptionAttachmentsTab = (key) => (
    <Tab
      eventKey={key}
      title={tabTitles[key]}
      key={`${key}_${deviceDescription.id}`}
      disabled={disabled(availableTabs.indexOf(key))}
    >
      {!deviceDescription.isNew && (
        <CommentSection section="device_description_attachments" element={deviceDescription} />
      )}
      <AttachmentTab
        key={`${deviceDescription.id}-attachments`}
        element={deviceDescription}
        elementType="DeviceDescription"
        attachments={deviceDescription.attachments || []}
        onDrop={handleAttachmentDrop}
        onDelete={handleAttachmentDelete}
        onUndoDelete={handleAttachmentUndoDelete}
        onEdit={handleAttachmentEdit}
        readOnly={isReadOnly()}
      />
    </Tab>
  );

  visibleTabs.forEach((key, i) => {
    if (key === 'attachments') {
      tabContents.push(deviceDescriptionAttachmentsTab(key));
    } else {
      tabContents.push(
        <Tab eventKey={key} title={tabTitles[key]} key={`${key}_${deviceDescription.id}`} disabled={disabled(i)}>
          {
            !deviceDescription.isNew
            && <CommentSection section={`device_description_${key}`} element={deviceDescription} />
          }
          {React.createElement(tabContentComponents[key], {
            key: `${deviceDescription.id}-${key}`,
            readonly: isReadOnly()
          })}
        </Tab>
      );
    }
  });

  const onTabPositionChanged = (visible) => {
    setVisibleTabs(visible);
  };

  const handleTabChange = (key) => {
    deviceDescriptionsStore.setActiveTabKey(key);
  };

  const handleSubmit = () => {
    LoadingActions.start();
    if (deviceDescription.is_new) {
      DetailActions.close(deviceDescription, true);
      ElementActions.createDeviceDescription(deviceDescription);
    } else {
      ElementActions.updateDeviceDescription(deviceDescription);
    }
    deviceDescriptionsStore.setCurrentDeviceDescriptionIdToSave(`${deviceDescription.id}`);
  };

  const deviceDescriptionIsValid = () => true; // TODO: validation

  const handleExportAnalyses = () => {
    deviceDescriptionsStore.toggleAnalysisStartExport();
    AttachmentFetcher.downloadZipByDeviceDescription(deviceDescription.id)
      .then(() => { deviceDescriptionsStore.toggleAnalysisStartExport(); })
      .catch((errorMessage) => { console.log(errorMessage); });
  };

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
  };

  return (
    <ElementDetailCard
      element={deviceDescription}
      isPendingToSave={deviceDescription.isPendingToSave}
      title={deviceDescription.name}
      titleTooltip={formatTimeStampsOfElement(deviceDescription || {})}
      footerToolbar={downloadAnalysisButton()}
      onSave={handleSubmit}
      saveDisabled={!deviceDescriptionIsValid()}
      showPrintCode
      showCalendar
    >
      <div className="tabs-container--with-borders">
        <ElementDetailSortTab
          type="device_description"
          availableTabs={availableTabs}
          tabTitles={tabTitles}
          onTabPositionChanged={onTabPositionChanged}
          openedFromCollectionId={openedFromCollectionId}
        />
        <Tabs
          activeKey={deviceDescriptionsStore.active_tab_key}
          onSelect={(key) => handleTabChange(key)}
          id="deviceDescriptionDetailsTab"
          mountOnEnter
          unmountOnExit
          className="has-config-overlay"
        >
          {tabContents}
        </Tabs>
      </div>
      <CommentModal element={deviceDescription} />
    </ElementDetailCard>
  );
}

DeviceDescriptionDetails.propTypes = {
  openedFromCollectionId: PropTypes.number,
};

DeviceDescriptionDetails.defaultProps = {
  openedFromCollectionId: null,
};

export default observer(DeviceDescriptionDetails);
