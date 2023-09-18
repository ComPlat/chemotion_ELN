import React from 'react';
import {
  ButtonGroup, OverlayTrigger, Tooltip, Button, Table, Panel
} from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import DeleteGroupDeviceButton from 'src/apps/admin/DeleteGroupDeviceButton';

import styles from 'Styles';

export default class AdminDeviceElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showUsers: false,
      showDevices: false,
      devices: props.currentState.devices
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
            this.setState({ groups: result.list });
            break;
          case 'Device':
            this.setState({ devices: result.list });
            break;
          default:
            break;
        }
      });
  }

  toggleUsers() {
    this.setState({
      showUsers: !this.state.showUsers
    });
  }

  renderDeviceButtons(device) {
    return (
      <td>
        <ButtonGroup aria-label="Device-Users">
          <OverlayTrigger placement="top" overlay={<Tooltip id="deviceUsersShow">List device users</Tooltip>}>
            <Button style={styles.grpIcons} bsSize="xsmall" type="button" bsStyle="info" onClick={this.toggleUsers}>
              <i className="fa fa-users" style={{ fontSize: '16px' }} />
              &nbsp;(
              {device.users.length < 10 ? `0${device.users.length}` : device.users.length}
              )
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="groupUsersAdd">Add device permission to users</Tooltip>}
          >
            <Button
              style={styles.grpIcons}
              bsSize="xsmall"
              type="button"
              onClick={() => this.props.onShowModal(device, 'Device', 'Person')}
            >
              <i className="fa fa-user" style={{ fontSize: '16px' }} />
              &nbsp;
              <i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="groupUsersAdd">Add device permission to groups</Tooltip>}
          >
            <Button
              style={styles.grpIcons}
              bsSize="xsmall"
              type="button"
              onClick={() => this.props.onShowModal(device, 'Device', 'Group')}
            >
              <i className="fa fa-users" style={{ fontSize: '16px' }} />
              &nbsp;
              <i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="inchi_tooltip">Edit device metadata</Tooltip>}>
            <Button
              style={styles.panelIcons}
              bsSize="xsmall"
              bsStyle="info"
              onClick={() => this.props.onShowDeviceMetadataModal(device)}
            >
              <i className="fa fa-pencil" style={{ fontSize: '16px' }} />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>
        &nbsp;&nbsp;&nbsp;
        <ButtonGroup>
          <DeleteGroupDeviceButton
            rootType="Device"
            groupRec={device}
            isRoot
            currentState={this.state}
            onChangeDeviceData={this.props.onChangeDeviceData}
          />
        </ButtonGroup>
      </td>
    );
  }

  render() {
    const { deviceElement } = this.props;
    const idx = this.props.index;
    const { showUsers } = this.state;

    return (
      <tbody key={`tbody_${deviceElement.id}`}>
        <tr
          style={{
            height: '25px',
            verticalAlign: 'middle',
            backgroundColor: idx % 2 === 0 ? '#F0F2F5' : '#F4F6F9',
          }}
          key={`row_${deviceElement.id}`}
          id={`row_${deviceElement.id}`}
        >
          <td>{idx + 1}</td>
          <td>{this.renderDeviceButtons(deviceElement)}</td>
          <td>{deviceElement.name}</td>
          <td>{deviceElement.name_abbreviation}</td>
          <td>{deviceElement.email}</td>
        </tr>
        <tr className={`collapse${showUsers ? 'in' : ''}`} id={`div_row_du${deviceElement.id}`}>
          <td colSpan="6">
            <Panel style={{ ...styles.panelItem, marginLeft: '100px' }}>
              <Panel.Title style={{
                fontWeight: 'bold', marginTop: '10px', marginLeft: '10px', marginBottom: '10px'
              }}
              >
                Managed by following users/groups
              </Panel.Title>
              <Table>
                <tbody>
                  {deviceElement.users.map((u, i) => (
                    <tr
                      key={`row_${deviceElement.id}_${u.id}`}
                      id={`row_${deviceElement.id}_${u.id}`}
                      style={{
                        height: '25px',
                        verticalAlign: 'middle',
                        backgroundColor: i % 2 === 0 ? '#F0F2F5' : '#F4F6F9',
                      }}
                    >
                      <td width="5%" style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                      <td width="30%" style={{ verticalAlign: 'middle' }}>{u.name}</td>
                      <td width="10%" style={{ verticalAlign: 'middle' }}>{u.initials}</td>
                      <td width="20%" style={{ verticalAlign: 'middle' }}>{u.type}</td>
                      <td width="15%" style={{ verticalAlign: 'middle' }}>{}</td>
                      <td width="20%" style={{ verticalAlign: 'middle' }}>
                        <DeleteGroupDeviceButton
                          rootType="Device"
                          actionType="Person"
                          groupRec={deviceElement}
                          userRec={u}
                          currentState={this.state}
                          onChangeDeviceData={this.props.onChangeDeviceData}
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
