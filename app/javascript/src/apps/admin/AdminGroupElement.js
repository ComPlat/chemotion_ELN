import React from 'react';
import {
  OverlayTrigger, Tooltip, Button, Table, Accordion
} from 'react-bootstrap';
import { FormattedMessage } from 'react-intl';
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
        <div className="d-inline-block me-2">
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="groupUsersShow">
                <FormattedMessage id="groups-list_group_users" />
              </Tooltip>
            )}
          >
            <Button size="sm" type="button" variant="info" onClick={this.toggleUsers}>
              <i className="fa fa-users me-1" />
              (
              {group.users.length < 10 ? `0${group.users.length}` : group.users.length}
              )
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="groupUsersAdd">
                <FormattedMessage id="groups-add_user_to_group" />
              </Tooltip>
            )}
          >
            <Button size="sm" variant="light" type="button" onClick={() => this.props.onShowModal(group, 'Group', 'Person')}>
              <i className="fa fa-user" />
              <i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </div>

        <div className="d-inline-block">
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="groupDevicesShow">
                <FormattedMessage id="groups-list_group_devices" />
              </Tooltip>
            )}
          >
            <Button size="sm" type="button" variant="success" onClick={this.toggleDevices}>
              <i className="fa fa-server me-1" />
              (
              {group.devices.length < 10 ? `0${group.devices.length}` : group.devices.length}
              )
            </Button>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="groupDevicesAdd">
                <FormattedMessage id="groups-add_device_to_group" />
              </Tooltip>
            )}
          >
            <Button size="sm" type="button" variant="light" onClick={() => this.props.onShowModal(group, 'Group', 'Device')}>
              <i className="fa fa-laptop" />
              <i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </div>
        <div className="d-inline-block ms-2">
          <DeleteGroupDeviceButton
            rootType="Group"
            groupRec={group}
            isRoot
            currentState={this.state}
            onChangeGroupData={this.props.onChangeGroupData}
          />
        </div>
      </td>
    );
  }

  renderGroupUserButtons(group, user) {
    const isAdmin = group.admins && group.admins.filter((a) => (a.id === user.id)).length > 0;
    const adminTooltip = (
      <Tooltip id="userAdmin">
        <FormattedMessage id={isAdmin === true ? 'groups-set_normal_user' : 'groups-set_administrator'} />
      </Tooltip>
    );
    return (
      <td>
        <div className="d-inline-block">
          <OverlayTrigger placement="top" overlay={adminTooltip}>
            <Button
              size="sm"
              type="button"
              variant={isAdmin === true ? 'light' : 'info'}
              onClick={() => this.setGroupAdmin(group, user, !isAdmin)}
            >
              <i className="fa fa-key" />
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
        </div>
      </td>
    );
  }

  render() {
    const { groupElement } = this.props;
    const idx = this.props.index;
    const { showUsers, showDevices } = this.state;
    const adminIcon = (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="admin">
            <FormattedMessage id="groups-group_administrator" />
          </Tooltip>
        )}
      >
        <i className="fa fa-key" />
      </OverlayTrigger>
    );

    return (
      <tbody key={`tbody_${groupElement.id}`}>
        <tr key={`row_${groupElement.id}`} id={`row_${groupElement.id}`} className="py-5">
          <td>{idx + 1}</td>
          {this.renderGroupButtons(groupElement)}
          <td>{groupElement.name}</td>
          <td>{groupElement.name_abbreviation}</td>
          <td>
            {groupElement.admins && groupElement.admins.map((x) => x.name).join(', ')}
          </td>
          <td>{groupElement.email}</td>
        </tr>
        {showUsers
          && (
          <tr id={`div_row_${groupElement.id}`}>
            <td colSpan="6">
              <Accordion defaultActiveKey="1">
                <Accordion.Item eventKey="1">
                  <Accordion.Header>
                    <FormattedMessage
                      id="groups-users_in_group"
                      values={{ name: groupElement.name }}
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <Table>
                      <tbody>
                        {groupElement.users.map((u, i) => (
                          <tr key={`row_${groupElement.id}_${u.id}`} id={`row_${groupElement.id}_${u.id}`}>
                            <td className="py-3">{i + 1}</td>
                            <td className="py-3">{u.name}</td>
                            <td className="py-3">{u.initials}</td>
                            <td className="py-3">{u.email}</td>
                            <td className="py-3">{groupElement.admins && groupElement.admins.filter((a) => (a.id === u.id)).length > 0 ? adminIcon : ''}</td>
                            {this.renderGroupUserButtons(groupElement, u)}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </td>
          </tr>
          )}
        {showDevices
          && (
          <tr id={`div_row_d${groupElement.id}`}>
            <td colSpan="6">
              <Accordion defaultActiveKey="1">
                <Accordion.Item eventKey="1">
                  <Accordion.Header eventKey="1">
                    <FormattedMessage
                      id="groups-devices_in_group"
                      values={{ name: groupElement.name }}
                    />
                  </Accordion.Header>
                  <Accordion.Body>
                    <Table>
                      <tbody>
                        {groupElement.devices.map((u, i) => (
                          <tr key={`row_${groupElement.id}_${u.id}`} id={`row_${groupElement.id}_${u.id}`}>
                            <td className="py-3">{i + 1}</td>
                            <td className="py-3 m-0">{u.name}</td>
                            <td className="py-3">{u.initials}</td>
                            <td className="py-3">{ }</td>
                            <td className="py-3">{ }</td>
                            <td className="py-3">
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
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </td>
          </tr>
          )}
      </tbody>
    );
  }
}
