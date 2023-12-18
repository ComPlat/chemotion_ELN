import React, { useState, useEffect } from 'react';
import {
  Panel, ButtonToolbar, Button, Tabs, Tab, Tooltip, OverlayTrigger
} from 'react-bootstrap';

import PropertiesForm from './propertiesTab/PropertiesForm';
import DetailsForm from './detailsTab/DetailsForm';
import AnalysesForm from './analysesTab/AnalysesForm';
import AttachmentForm from './attachmentsTab/AttachmentForm';
import MaintainanceForm from './maintainanceTab/MaintainanceForm';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import ConfirmClose from 'src/components/common/ConfirmClose';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import Immutable from 'immutable';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

const DeviceDescriptionDetails = ({ deviceDescription, toggleFullScreen }) => {
  const [activeTab, setActiveTab] = useState('properties'); // state from store
  const [visibleTabs, setVisibleTabs] = useState(Immutable.List());

  const submitLabel = deviceDescription.isNew ? 'Create' : 'Save';
  let tabContents = [];

  const tabContentComponents = {
    properties: PropertiesForm,
    detail: DetailsForm,
    analyses: AnalysesForm,
    attachments: AttachmentForm,
    maintainance: MaintainanceForm,
  };

  const tabTitles = {
    properties: 'Properties',
    detail: 'Details',
    analyses: 'Analyses',
    attachments: 'Attachment',
    maintainance: 'Maintainance',
  };

  visibleTabs.forEach((key) => {
    let title = key.charAt(0).toUpperCase() + key.slice(1);
    tabContents.push(
      <Tab eventKey={key} title={title} key={`${key}_${deviceDescription.id}`}>
        {React.createElement(tabContentComponents[key], {
          key: `${deviceDescription.id}-${key}`, deviceDescription: deviceDescription
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

  }

  const deviceDescriptionHeader = () => {
    const saveBtnDisplay = deviceDescription.isEdited ? '' : 'none';
    const datetp = formatTimeStampsOfElement(deviceDescription || {});

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
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="saveDeviceDescription">Save device description</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right" onClick={() => handleSubmit()} style={{ display: saveBtnDisplay }}>
            <i className="fa fa-floppy-o " />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => toggleFullScreen()}>
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        <PrintCodeButton element={deviceDescription} />
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
          <Button bsStyle="warning" onClick={() => handleSubmit()}>
            {submitLabel}
          </Button>
        </ButtonToolbar>
      </Panel.Body>
    </Panel>
  );
}

export default DeviceDescriptionDetails;
