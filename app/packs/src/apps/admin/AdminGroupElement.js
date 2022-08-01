import React from 'react';
import { ButtonGroup, OverlayTrigger, Tooltip, Button, Table, Panel } from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { findIndex } from 'lodash';
import DeleteGroupDeviceButton from 'src/apps/admin/DeleteGroupDeviceButton';

export default class AdminGroupElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showUsers: false,
      showDevices: false,
      groups: props.currentState.groups
    };

    this.toggleUsers = this.toggleUsers.bind(this);
    this.toggleDevices = this.toggleDevices.bind(this);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  setGroupAdmin(groupRec, userRec, setAdmin = true) {
    const { groups } = this.state;
    const params = {
      action: 'NodeAdm',
      rootType: 'Group',
      actionType: 'Adm',
      id: groupRec.id,
      admin_id: userRec.id,
      set_admin: setAdmin
    };
    AdminFetcher.updateGroup(params)
      .then((result) => {
        if (setAdmin) {
          groupRec.admins.splice(1, 0, userRec);
        } else {
          const usrIdx = findIndex(groupRec.admins, o => o.id === userRec.id);
          groupRec.admins.splice(usrIdx, 1);
        }
        const idx = findIndex(groups, o => o.id === groupRec.id);
        groups.splice(idx, 1, groupRec);
        this.props.onChangeGroupData(groups);
      });
  }

  toggleUsers() {
    this.setState({
      showUsers: !this.state.showUsers
    })
  }

  toggleDevices() {
    this.setState({
      showDevices: !this.state.showDevices
    })
  }

  renderGroupButtons(group) {
    return (
      <td>
        <ButtonGroup aria-label="Group-Users">
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersShow">List Group-Users</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="info" onClick={this.toggleUsers} >
              <i className="fa fa-users" />&nbsp;({group.users.length < 10 ? `0${group.users.length}` : group.users.length})
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add user to group</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.props.onShowModal(group, 'Group', 'Person')} >
              <i className="fa fa-user" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>&nbsp;&nbsp;

        <ButtonGroup>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupDevicesShow">List Group-Devices</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="success" onClick={this.toggleDevices} >
              <i className="fa fa-server" />&nbsp;({group.devices.length < 10 ? `0${group.devices.length}` : group.devices.length})
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device to group</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.props.onShowModal(group, 'Group', 'Device')} >
              <i className="fa fa-laptop" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>&nbsp;&nbsp;
        <ButtonGroup>
          <DeleteGroupDeviceButton rootType={'Group'}
            groupRec={group}
            isRoot={true}
            currentState={this.state}
            onChangeGroupData={this.props.onChangeGroupData} />
        </ButtonGroup>
      </td>
    );
  }

  renderGroupUserButtons(group, user) {
    const isAdmin = group.admins && group.admins.filter(a => (a.id === user.id)).length > 0;
    const adminTooltip = isAdmin === true ? 'set to normal user' : 'set to Administrator';
    return (
      <td>
        <ButtonGroup className="actions">
          <OverlayTrigger placement="top" overlay={<Tooltip id="userAdmin">{adminTooltip}</Tooltip>}>
            <Button
              bsSize="xsmall"
              type="button"
              bsStyle={isAdmin === true ? 'default' : 'info'}
              onClick={() => this.setGroupAdmin(group, user, !isAdmin)}
            >
              <i className="fa fa-key" />
            </Button>
          </OverlayTrigger>
          <DeleteGroupDeviceButton rootType={'Group'}
            actionType={'Person'}
            groupRec={group}
            userRec={user}
            currentState={this.state}
            onChangeGroupData={this.props.onChangeGroupData} />
        </ButtonGroup>
        &nbsp;&nbsp;
      </td>
    );
  }

  render() {
    const { groupElement } = this.props;
    let idx = this.props.index;
    const { showUsers, showDevices } = this.state;
    const adminIcon = (<OverlayTrigger placement="top" overlay={<Tooltip id="admin">Group Administrator</Tooltip>}><i className="fa fa-key" /></OverlayTrigger>);

    return (
      <tbody key={`tbody_${groupElement.id}`}>
        <tr key={`row_${groupElement.id}`} id={`row_${groupElement.id}`} style={{ fontWeight: 'bold' }}>
          <td>{idx + 1}</td>
          {this.renderGroupButtons(groupElement)}
          <td>{groupElement.name}</td>
          <td>{groupElement.name_abbreviation}</td>
          <td>
            {groupElement.admins && groupElement.admins.map(x => x.name).join(', ')}&nbsp;&nbsp;
          </td>
          <td>{groupElement.email}</td>
        </tr>
        <tr className={'collapse' + (showUsers ? 'in' : '')} id={`div_row_${groupElement.id}`}>
          <td colSpan="7">
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  Users in Group: {groupElement.name}
                </Panel.Title>
              </Panel.Heading>
              <Table>
                <tbody>
                  {groupElement.users.map((u, i) => (
                    <tr key={`row_${groupElement.id}_${u.id}`} id={`row_${groupElement.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                      <td width="5%">{i + 1}</td>
                      <td width="20%">{u.name}</td>
                      <td width="10%">{u.initials}</td>
                      <td width="20%">{u.email}</td>
                      <td width="15%">{groupElement.admins && groupElement.admins.filter(a => (a.id === u.id)).length > 0 ? adminIcon : ''}</td>
                      <td width="30%">{this.renderGroupUserButtons(groupElement, u)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </td>
        </tr>
        <tr className={'collapse' + (showDevices ? 'in' : '')} id={`div_row_d${groupElement.id}`}>
          <td colSpan="7">
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  Devices in Group: {groupElement.name}
                </Panel.Title>
              </Panel.Heading>
              <Table>
                <tbody>
                  {groupElement.devices.map((u, i) => (
                    <tr key={`row_${groupElement.id}_${u.id}`} id={`row_${groupElement.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                      <td width="5%">{i + 1}</td>
                      <td width="20%">{u.name}</td>
                      <td width="10%">{u.initials}</td>
                      <td width="20%">{}</td>
                      <td width="15%">{}</td>
                      <td width="30%">
                        <DeleteGroupDeviceButton rootType={'Group'}
                          actionType={'Device'}
                          groupRec={groupElement}
                          userRec={u}
                          currentState={this.state}
                          onChangeGroupData={this.props.onChangeGroupData} /></td>
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
