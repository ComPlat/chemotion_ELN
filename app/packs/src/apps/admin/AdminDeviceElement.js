import React from 'react';
import {
  ButtonGroup, OverlayTrigger, Tooltip, Button, Table, Panel
} from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import DeleteGroupDeviceButton from 'src/apps/admin/DeleteGroupDeviceButton';
import PropTypes from 'prop-types';

export default class AdminDeviceElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showUsers: false
    };

    this.toggleUsers = this.toggleUsers.bind(this);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  fetch(type) {
    AdminFetcher.fetchGroupsDevices(type)
      .then((result) => {
        switch (type) {
          case 'Group':
            // eslint-disable-next-line react/no-unused-state
            this.setState({ groups: result.list });
            break;
          case 'Device':
            // eslint-disable-next-line react/no-unused-state
            this.setState({ devices: result.list });
            break;
          default:
            break;
        }
      });
  }

  toggleUsers() {
    const { showUsers } = this.state;
    this.setState({
      showUsers: !showUsers
    });
  }

  renderDeviceButtons(device) {
    const {
      onChangeDeviceData, onShowDeviceMetadataModal, onShowModal, handleToggleDeviceSuper, onShowDeviceApiToken
    } = this.props;
    return (
      <td>
        <ButtonGroup aria-label="Device-Users">
          <OverlayTrigger placement="top" overlay={<Tooltip id="deviceUsersShow">List Device-Users</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="info" onClick={this.toggleUsers}>
              <i className="fa fa-users" />
&nbsp;(
              {device.users.length < 10 ? `0${device.users.length}` : device.users.length}
              )
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="groupUsersAdd">Add device permission to users</Tooltip>}
          >
            <Button bsSize="xsmall" type="button" onClick={() => onShowModal(device, 'Device', 'Person')}>
              <i className="fa fa-user" />
              <i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="groupUsersAdd">Add device permission to groups</Tooltip>}
          >
            <Button bsSize="xsmall" type="button" onClick={() => onShowModal(device, 'Device', 'Group')}>
              <i className="fa fa-users" />
              <i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="inchi_tooltip">Edit Device Metadata</Tooltip>}>
            <Button bsSize="xsmall" bsStyle="info" onClick={() => onShowDeviceMetadataModal(device)}>
              <i className="fa fa-laptop" />
            </Button>
          </OverlayTrigger>

          {device.is_super_device
            ? (
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="groupUsersAdd">Remove device super privileges. Which means that this device can create new devices.</Tooltip>}
              >
                {/* eslint-disable-next-line max-len */}
                <Button bsSize="xsmall" bsStyle="success" type="button" onClick={() => handleToggleDeviceSuper(device.id)}>
                  <i className="fa fa-star" />
                </Button>
              </OverlayTrigger>
            ) : (
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="groupUsersAdd">Give device super privileges. Which means that this device can create new devices.</Tooltip>}
              >
                <Button bsSize="xsmall" type="button" onClick={() => handleToggleDeviceSuper(device.id)}>
                  <i className="fa fa-star" />
                </Button>
              </OverlayTrigger>
            )}

          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="groupUsersAdd">Generate API token</Tooltip>}
          >
            <Button bsSize="xsmall" bsStyle="info" type="button" onClick={() => onShowDeviceApiToken(device)}>
              <i className="fa fa-code" />
            </Button>
          </OverlayTrigger>

        </ButtonGroup>
&nbsp;&nbsp;
        <ButtonGroup>
          <DeleteGroupDeviceButton
            rootType="Device"
            groupRec={device}
            isRoot
            currentState={this.state}
            onChangeDeviceData={onChangeDeviceData}
          />
        </ButtonGroup>
      </td>
    );
  }

  render() {
    // eslint-disable-next-line react/prop-types
    const { deviceElement, onChangeDeviceData, index } = this.props;
    const { showUsers } = this.state;

    return (
      <tbody key={`tbody_${deviceElement.id}`}>
        <tr key={`row_${deviceElement.id}`} id={`row_${deviceElement.id}`} style={{ fontWeight: 'bold' }}>
          <td>{index + 1}</td>
          {this.renderDeviceButtons(deviceElement)}
          <td>{deviceElement.name}</td>
          <td>{deviceElement.name_abbreviation}</td>
          <td>{deviceElement.email}</td>
        </tr>
        <tr className={`collapse${showUsers ? 'in' : ''}`} id={`div_row_du${deviceElement.id}`}>
          <td colSpan="5">
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  Device: [
                  {deviceElement.name}
                  ] managed by following users/groups
                  {' '}
                  <br />
                </Panel.Title>
              </Panel.Heading>
              <Table>
                <tbody>
                  {deviceElement.users.map((u, i) => (
                    <tr
                      key={`row_${deviceElement.id}_${u.id}`}
                      id={`row_${deviceElement.id}_${u.id}`}
                      style={{ backgroundColor: '#c4e3f3' }}
                    >
                      <td width="5%">{i + 1}</td>
                      <td width="30%">{u.name}</td>
                      <td width="10%">{u.initials}</td>
                      <td width="20%">{u.type}</td>
                      <td width="15%">{}</td>
                      <td width="20%">
                        <DeleteGroupDeviceButton
                          rootType="Device"
                          actionType="Person"
                          groupRec={deviceElement}
                          userRec={u}
                          currentState={this.state}
                          onChangeDeviceData={onChangeDeviceData}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </td>
        </tr>
      </tbody>
    );
  }
}

const PropDevice = {
  id: PropTypes.number.isRequired,
  name_abbreviation: PropTypes.number.isRequired,
  name: PropTypes.number.isRequired,
  email: PropTypes.number.isRequired,
  is_super_device: PropTypes.number.isRequired,
};

AdminDeviceElement.propTypes = {
  deviceElement: PropTypes.shape(PropDevice).isRequired,
  index: PropTypes.number.isRequired,
  currentState: PropTypes.shape({
    devices: PropTypes.arrayOf(PropTypes.shape(PropDevice))
  }).isRequired,
  onChangeDeviceData: PropTypes.func.isRequired,
  handleToggleDeviceSuper: PropTypes.func.isRequired,
  onShowModal: PropTypes.func.isRequired,
  onShowDeviceMetadataModal: PropTypes.func.isRequired,
  onShowDeviceApiToken: PropTypes.func.isRequired
};
