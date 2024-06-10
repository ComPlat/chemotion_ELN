import React from 'react'
import { ButtonToolbar, Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import ElementActions from 'src/stores/alt/actions/ElementActions'
import DetailActions from 'src/stores/alt/actions/DetailActions'
import DeviceManagement from 'src/apps/mydb/elements/details/devices/DeviceManagement'
import Panel from 'src/components/legacyBootstrap/Panel'
import PanelGroup from 'src/components/legacyBootstrap/PanelGroup'


const DeviceDetails = ({ device, toggleFullScreen }) => {
  return (
    <Panel
      className='panel-detail'
      variant={device.isPendingToSave ? 'info' : 'primary'}
    >
      <Panel.Heading>
        {<Header device={device} toggleFullScreen={toggleFullScreen} />}
      </Panel.Heading>
      <Panel.Body>
        <PanelGroup defaultActiveKey="0" accordion>
          <Panel eventKey="1">
            <Panel.Heading>
              <Panel.Title toggle>
                Device Management
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body collapsible="true">
              <DeviceManagement />
            </Panel.Body>
          </Panel>
        </PanelGroup>

        <ButtonToolbar>
          <Button variant="primary" onClick={() => DetailActions.close(device)}>
            Close
          </Button>
          <Button variant="warning" onClick={() => handleSubmit(device)}>
            Save
          </Button>
        </ButtonToolbar>
      </Panel.Body>
    </Panel>
  )
}

export default DeviceDetails

const handleSubmit = (device) => {
  device.updateChecksum()
  ElementActions.saveDevice(device)
}

const Header = ({ device, toggleFullScreen }) => {
  return (
    <div>
      {device.title}
      <OverlayTrigger placement="bottom"
        overlay={<Tooltip id="closeReaction">Close Device</Tooltip>}>
        <Button variant="danger" size="sm"
          onClick={() => DetailActions.close(device)}>
          <i className="fa fa-times"></i>
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="bottom"
        overlay={<Tooltip id="saveReaction">Save Device</Tooltip>}>
        <Button variant="warning" size="sm"
          onClick={() => handleSubmit(device)}>
          <i className="fa fa-floppy-o "></i>
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="bottom"
        overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
        <Button variant="info" size="sm"
          onClick={() => toggleFullScreen()}>
          <i className="fa fa-expand"></i>
        </Button>
      </OverlayTrigger>
    </div>
  )
}
