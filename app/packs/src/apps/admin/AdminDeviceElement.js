import React from 'react';
import { ButtonGroup, OverlayTrigger, Tooltip, Button, Table, Panel } from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import DeleteGroupDeviceButton from 'src/apps/admin/DeleteGroupDeviceButton';

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
          <OverlayTrigger placement="top" overlay={<Tooltip id="deviceUsersShow">List Device-Users</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="info" onClick={this.toggleUsers} >
              <i className="fa fa-users" />&nbsp;({device.users.length < 10 ? `0${device.users.length}` : device.users.length})
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device permission to users</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.props.onShowModal(device, 'Device', 'Person')} >
              <i className="fa fa-user" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device permission to groups</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.props.onShowModal(device, 'Device', 'Group')} >
              <i className="fa fa-users" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id="inchi_tooltip">Edit Device Metadata</Tooltip>} >
            <Button bsSize="xsmall" bsStyle="info" onClick={() => this.props.onShowDeviceMetadataModal(device)}>
              <i className="fa fa-laptop" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>&nbsp;&nbsp;

        <ButtonGroup>
          <DeleteGroupDeviceButton rootType={'Device'}
            groupRec={device}
            isRoot={true}
            currentState={this.state}
            onChangeDeviceData={this.props.onChangeDeviceData} />
        </ButtonGroup>
      </td>
    );
  }

  render() {
    const { deviceElement } = this.props;
    let idx = this.props.index;
    const { showUsers } = this.state;

    return (
      <tbody key={`tbody_${deviceElement.id}`}>
        <tr key={`row_${deviceElement.id}`} id={`row_${deviceElement.id}`} style={{ fontWeight: 'bold' }}>
          <td>{idx + 1}</td>
          {this.renderDeviceButtons(deviceElement)}
          <td>{deviceElement.name}</td>
          <td>{deviceElement.name_abbreviation}</td>
          <td>{deviceElement.email}</td>
        </tr>
        <tr className={'collapse' + (showUsers ? 'in' : '')} id={`div_row_du${deviceElement.id}`}>
          <td colSpan="5">
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  Device: [{deviceElement.name}] managed by following users/groups <br />
                </Panel.Title>
              </Panel.Heading>
              <Table>
                <tbody>
                  {deviceElement.users.map((u, i) => (
                    <tr key={`row_${deviceElement.id}_${u.id}`} id={`row_${deviceElement.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                      <td width="5%">{i + 1}</td>
                      <td width="30%">{u.name}</td>
                      <td width="10%">{u.initials}</td>
                      <td width="20%">{u.type}</td>
                      <td width="15%">{}</td>
                      <td width="20%"><DeleteGroupDeviceButton rootType='Device'
                        actionType='Person'
                        groupRec={deviceElement}
                        userRec={u}
                        currentState={this.state}
                        onChangeDeviceData={this.props.onChangeDeviceData} /></td>
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
