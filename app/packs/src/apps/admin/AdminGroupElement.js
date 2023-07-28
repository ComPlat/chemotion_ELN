import React from 'react';
import {
  ButtonGroup, OverlayTrigger, Tooltip, Button, Table, Panel
} from 'react-bootstrap';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { findIndex } from 'lodash';
import DeleteGroupDeviceButton from 'src/apps/admin/DeleteGroupDeviceButton';

import styles from 'Styles';

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
          const usrIdx = findIndex(groupRec.admins, (o) => o.id === userRec.id);
          groupRec.admins.splice(usrIdx, 1);
        }
        const idx = findIndex(groups, (o) => o.id === groupRec.id);
        groups.splice(idx, 1, groupRec);
        this.props.onChangeGroupData(groups);
      });
  }

  toggleUsers() {
    this.setState({
      showUsers: !this.state.showUsers
    });
  }

  toggleDevices() {
    this.setState({
      showDevices: !this.state.showDevices
    });
  }

  renderGroupButtons(group) {
    return (
      <td>
        <ButtonGroup aria-label="Group-Users">
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersShow">List group users</Tooltip>}>
            <Button style={styles.grpIcons} bsSize="xsmall" type="button" bsStyle="info" onClick={this.toggleUsers}>
              <i className="fa fa-users" style={{ fontSize: '16px' }} />
              &nbsp;(
              {group.users.length < 10 ? `0${group.users.length}` : group.users.length}
              )
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add user to group</Tooltip>}>
            <Button
              style={styles.panelIcons}
              bsSize="xsmall"
              type="button"
              onClick={() => this.props.onShowModal(group, 'Group', 'Person')}
            >
              <i className="fa fa-user-plus" style={{ fontSize: '16px' }} />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>
        &nbsp;&nbsp;
        <ButtonGroup>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupDevicesShow">List group devices</Tooltip>}>
            <Button
              style={styles.grpIcons}
              bsSize="xsmall"
              type="button"
              bsStyle="success"
              onClick={this.toggleDevices}
            >
              <i className="fa fa-server" style={{ fontSize: '16px' }} />
              &nbsp;(
              {group.devices.length < 10 ? `0${group.devices.length}` : group.devices.length}
              )
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device to group</Tooltip>}>
            <Button
              style={styles.panelIcons}
              bsSize="xsmall"
              type="button"
              onClick={() => this.props.onShowModal(group, 'Group', 'Device')}
            >
              <i className="fa fa-plus-square" style={{ fontSize: '16px' }} />

            </Button>
          </OverlayTrigger>
        </ButtonGroup>
        &nbsp;&nbsp;
        <OverlayTrigger placement="top" overlay={<Tooltip>Delete group</Tooltip>}>
          <ButtonGroup>
            <DeleteGroupDeviceButton
              rootType="Group"
              groupRec={group}
              isRoot
              currentState={this.state}
              onChangeGroupData={this.props.onChangeGroupData}
            />
          </ButtonGroup>
        </OverlayTrigger>

      </td>
    );
  }

  renderGroupUserButtons(group, user) {
    const isAdmin = group.admins && group.admins.filter((a) => (a.id === user.id)).length > 0;
    const adminTooltip = isAdmin === true ? 'set to normal user' : 'set to Administrator';
    return (
      <td>
        <ButtonGroup className="actions">
          <OverlayTrigger placement="top" overlay={<Tooltip id="userAdmin">{adminTooltip}</Tooltip>}>
            <Button
              style={styles.panelIcons}
              bsSize="xsmall"
              type="button"
              bsStyle={isAdmin === true ? 'default' : 'warning'}
              onClick={() => this.setGroupAdmin(group, user, !isAdmin)}
            >
              <i className="fa fa-key" style={{ fontSize: '16px' }} />
            </Button>
          </OverlayTrigger>
          <DeleteGroupDeviceButton
            rootType="Group"
            actionType="Person"
            groupRec={group}
            userRec={user}
            currentState={this.state}
            onChangeGroupData={this.props.onChangeGroupData}
          />
        </ButtonGroup>
        &nbsp;&nbsp;
      </td>
    );
  }

  render() {
    const { groupElement } = this.props;
    const idx = this.props.index;
    const { showUsers, showDevices } = this.state;
    const adminIcon = (
      <OverlayTrigger placement="top" overlay={<Tooltip id="admin">Group Administrator</Tooltip>}>
        <i className="fa fa-key" style={{ fontSize: '16px' }} />
      </OverlayTrigger>
    );

    return (
      <tbody key={`tbody_${groupElement.id}`}>
        <tr
          style={{
            height: '25px',
            verticalAlign: 'middle',
            backgroundColor: idx % 2 === 0 ? '#F0F2F5' : '#F4F6F9',

          }}
          key={`row_${groupElement.id}`}
          id={`row_${groupElement.id}`}
        >
          <td>{idx + 1}</td>
          <td>{this.renderGroupButtons(groupElement)}</td>
          <td>{groupElement.name}</td>
          <td>{groupElement.name_abbreviation}</td>
          <td>
            {groupElement.admins && groupElement.admins.map((x) => x.name).join(', ')}
          &nbsp;&nbsp;
          </td>
          <td>{groupElement.email}</td>
        </tr>
        <tr className={`collapse${showUsers ? 'in' : ''}`} id={`div_row_${groupElement.id}`}>
          <td colSpan="7">
            <Panel style={{ ...styles.panelItem, marginLeft: '100px' }}>
              <Panel.Title style={{
                fontWeight: 'bold', marginTop: '10px', marginLeft: '10px', marginBottom: '10px'
              }}
              >
                Group users
              </Panel.Title>
              <Table>
                <tbody>
                  {groupElement.users.map((u, i) => (
                    <tr
                      key={`row_${groupElement.id}_${u.id}`}
                      id={`row_${groupElement.id}_${u.id}`}
                      style={{
                        height: '25px',
                        verticalAlign: 'middle',
                        backgroundColor: idx % 2 === 0 ? '#F0F2F5' : '#F4F6F9',
                      }}
                    >
                      <td width="5%" style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                      <td width="20%" style={{ verticalAlign: 'middle' }}>{u.name}</td>
                      <td width="10%" style={{ verticalAlign: 'middle' }}>{u.initials}</td>
                      <td width="20%" style={{ verticalAlign: 'middle' }}>{u.email}</td>
                      <td width="15%" style={{ verticalAlign: 'middle' }}>
                        {groupElement.admins
                          && groupElement.admins.filter((a) => (a.id === u.id)).length > 0 ? adminIcon : ''}
                      </td>
                      <td
                        width="30%"
                        style={{ verticalAlign: 'middle' }}
                      >
                        {this.renderGroupUserButtons(groupElement, u)}

                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </td>
        </tr>
        <tr className={`collapse${showDevices ? 'in' : ''}`} id={`div_row_d${groupElement.id}`}>
          <td colSpan="7">
            <Panel style={{ ...styles.panelItem, marginLeft: '100px' }}>
              <Panel.Title style={{
                fontWeight: 'bold', marginTop: '10px', marginLeft: '10px', marginBottom: '10px'
              }}
              >
                Group devices
              </Panel.Title>
              <Table>
                <tbody>
                  {groupElement.devices.map((u, i) => (
                    <tr
                      key={`row_${groupElement.id}_${u.id}`}
                      id={`row_${groupElement.id}_${u.id}`}
                      style={{
                        height: '25px',
                        verticalAlign: 'middle',
                        backgroundColor: i % 2 === 0 ? '#F0F2F5' : '#F4F6F9',
                      }}
                    >
                      <td width="5%" style={{ verticalAlign: 'middle' }}>{i + 1}</td>
                      <td width="20%" style={{ verticalAlign: 'middle' }}>{u.name}</td>
                      <td width="10%" style={{ verticalAlign: 'middle' }}>{u.initials}</td>
                      <td width="20%" style={{ verticalAlign: 'middle' }}>{}</td>
                      <td width="15%" style={{ verticalAlign: 'middle' }}>{}</td>
                      <td
                        width="30%"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <DeleteGroupDeviceButton
                          rootType="Group"
                          actionType="Device"
                          groupRec={groupElement}
                          userRec={u}
                          currentState={this.state}
                          onChangeGroupData={this.props.onChangeGroupData}
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
