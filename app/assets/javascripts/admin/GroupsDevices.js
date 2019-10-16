import React from 'react';
import { Modal, Panel, Table, Button, FormGroup, ControlLabel, Form, Tooltip, ButtonGroup, FormControl, Popover, OverlayTrigger } from 'react-bootstrap';
import Select from 'react-select';
import { findIndex, filter } from 'lodash';
import AdminFetcher from '../components/fetchers/AdminFetcher';

export default class GroupsDevices extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      devices: [],
      showModal: false,
      showCreateModal: false,
      rootType: '', // Group, Device
      actionType: 'Person', // Person Group Device Adm
      root: {}
    };
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.loadUserByNameType = this.loadUserByNameType.bind(this);
    this.handleShowModal = this.handleShowModal.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleShowCreateModal = this.handleShowCreateModal.bind(this);
    this.handleCloseGroup = this.handleCloseGroup.bind(this);
  }

  componentDidMount() {
    this.fetch('Group');
    this.fetch('Device');
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
        this.setState({ groups });
      });
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

  fetchDevices(type = 'Device') {
    AdminFetcher.fetchGroupsDevices(type)
      .then((result) => {
        this.setState({
          devices: result.list
        });
      });
  }

  handleShowModal(root, rootType, actionType) {
    this.setState({
      showModal: true,
      actionType,
      rootType,
      root
    });
  }

  handleClose() {
    this.setState({
      showModal: false,
      rootType: '',
      actionType: '',
      root: null
    });
  }


  handleShowCreateModal(rootType) {
    this.setState({
      showCreateModal: true,
      rootType
    });
  }

  handleCloseGroup() {
    this.setState({ showCreateModal: false });
  }

  handleSelectUser(val) {
    if (val) { this.setState({ selectedUsers: val }); }
  }

  loadUserByNameType(input) {
    const { actionType } = this.state;
    if (!input) {
      return Promise.resolve({ options: [] });
    }

    return AdminFetcher.fetchUsersByNameType(input, actionType)
      .then((res) => {
        const usersEntries = res.users.filter(u => u.user_type == actionType)
          .map(u => ({
            value: u.id,
            name: u.name,
            label: `${u.name} (${u.abb})`
          }));
        return { options: usersEntries };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createGroup() {
    const { groups, devices, rootType } = this.state;
    const param = {
      rootType,
      first_name: this.firstInput.value.trim(),
      last_name: this.lastInput.value.trim(),
      name_abbreviation: this.abbrInput.value.trim()
    };

    if (this.emailInput.value.trim().length > 0) {
      param.email = this.emailInput.value.trim();
    }

    AdminFetcher.createGroupDevice(param)
      .then((result) => {
        if (result.error) {
          alert(result.error);
        } else {
          switch (rootType) {
            case 'Group':
              groups.push(result);
              this.setState({
                groups,
                showCreateModal: false
              });
              break;
            case 'Device':
              devices.push(result);
              this.setState({
                devices,
                showCreateModal: false
              });
              break;
            default:
              break;
          }
        }
      });
  }

  confirmDelete(rootType, actionType, groupRec, userRec, isRoot = false) {
    const { groups, devices } = this.state;
    const rmUsers = userRec == null ? [] : [userRec.id];

    const params = {
      action: isRoot ? 'RootDel' : 'NodeDel',
      rootType,
      actionType,
      id: groupRec.id,
      destroy_obj: isRoot,
      rm_users: rmUsers
    };

    AdminFetcher.updateGroup(params)
      .then((result) => {
        switch (rootType) {
          case 'Group':
            if (isRoot === true) {
              this.setState({
                groups: filter(this.state.groups, o => o.id != groupRec.id),
              });
            } else {
              const idx = findIndex(groups, o => o.id === result.root.id);
              groups.splice(idx, 1, result.root);
              this.setState({ groups });
            }
            this.fetch('Device');
            break;
          case 'Device':
            if (isRoot === true) {
              this.setState({
                devices: filter(this.state.devices, o => o.id !== groupRec.id),
              });
            } else {
              const idx = findIndex(devices, o => o.id === result.root.id);
              devices.splice(idx, 1, result.root);
              this.setState({ devices });
            }
            this.fetch('Group');
            break;
          default:
            break;
        }
      });
  }

  addToRoot(groupRec) {
    const {
      selectedUsers,
      groups,
      devices,
      rootType,
      actionType
    } = this.state;

    const userIds = [];
    selectedUsers.map((g) => {
      userIds.push(g.value);
      return true;
    });

    const params = {
      action: 'NodeAdd',
      rootType,
      actionType,
      id: groupRec.id,
      add_users: userIds
    };
    let idx = -1;
    AdminFetcher.updateGroup(params)
      .then((result) => {
        switch (rootType) {
          case 'Group':
            idx = findIndex(groups, o => o.id === result.root.id);
            groups.splice(idx, 1, result.root);
            this.fetch('Device');
            break;
          case 'Device':
            idx = findIndex(devices, o => o.id === result.root.id);
            devices.splice(idx, 1, result.root);
            this.fetch('Group');
            break;
          default:
            break;
        }
        this.setState({ selectedUsers: null, showModal: false });
      });
  }

  renderGroups() {
    const { groups } = this.state;
    const adminIcon = (<OverlayTrigger placement="top" overlay={<Tooltip id="admin">Group Administrator</Tooltip>}><i className="fa fa-key" /></OverlayTrigger>);
    let tbody = '';
    if (Object.keys(groups).length <= 0) {
      tbody = '';
    } else {
      tbody = groups.map((g, idx) => (
        <tbody key={`tbody_${g.id}`}>
          <tr key={`row_${g.id}`} id={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
            <td>{idx + 1}</td>
            { this.renderGroupButtons(g) }
            <td>{g.name}</td>
            <td>{g.name_abbreviation}</td>
            <td>
              {g.admins && g.admins.map(x => x.name).join(', ')}&nbsp;&nbsp;
            </td>
            <td>{g.email}</td>
          </tr>
          <tr className={`collapse div_row_${g.id}`} id={`div_row_${g.id}`}>
            <td colSpan="7">
              <Panel>
                <Panel.Heading>
                  <Panel.Title>
                    Users in Group: {g.name}
                  </Panel.Title>
                </Panel.Heading>
                <Table>
                  <tbody>
                    {g.users.map((u, i) => (
                      <tr key={`row_${g.id}_${u.id}`} id={`row_${g.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                        <td width="5%">{i + 1}</td>
                        <td width="20%">{u.name}</td>
                        <td width="10%">{u.initials}</td>
                        <td width="20%">{u.email}</td>
                        <td width="15%">{g.admins && g.admins.filter(a => (a.id === u.id)).length > 0 ? adminIcon : ''}</td>
                        <td width="30%">{ this.renderGroupUserButtons(g, u) }</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Panel>
            </td>
          </tr>
          <tr className={`collapse div_row_d${g.id}`} id={`div_row_d${g.id}`}>
            <td colSpan="7">
              <Panel>
                <Panel.Heading>
                  <Panel.Title>
                    Devices in Group: {g.name}
                  </Panel.Title>
                </Panel.Heading>
                <Table>
                  <tbody>
                    {g.devices.map((u, i) => (
                      <tr key={`row_${g.id}_${u.id}`} id={`row_${g.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                        <td width="5%">{i + 1}</td>
                        <td width="20%">{u.name}</td>
                        <td width="10%">{u.initials}</td>
                        <td width="20%">{}</td>
                        <td width="15%">{}</td>
                        <td width="30%">{ this.renderDeleteButton('Group', 'Device', g, u) }</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Panel>
            </td>
          </tr>
        </tbody>
      ));
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title>
            Group List &nbsp;
            ({groups.length}) &nbsp;
            <Button bsStyle="default" onClick={() => this.handleShowCreateModal('Group')}>Add New Group</Button>
          </Panel.Title>
        </Panel.Heading>
        <Table responsive condensed hover>
          <thead>
            <tr style={{ backgroundColor: '#ddd' }}>
              <th width="5%">#</th>
              <th width="25%">Actions</th>
              <th width="20%">Name</th>
              <th width="10%">Kürzel</th>
              <th width="20%">Admin by</th>
              <th width="20%">Email</th>
            </tr>
          </thead>
          { tbody }
        </Table>
      </Panel>
    );
  }

  renderDevices() {
    const { devices } = this.state;

    let tbody = '';
    if (typeof (devices) !== 'undefined' && Object.keys(devices).length <= 0) {
      tbody = '';
    } else {
      tbody = devices && devices.map((g, idx) => (
        <tbody key={`tbody_${g.id}`}>
          <tr key={`row_${g.id}`} id={`row_${g.id}`} style={{ fontWeight: 'bold' }}>
            <td>{idx + 1}</td>
            { this.renderDeviceButtons(g) }
            <td>{g.name}</td>
            <td>{g.name_abbreviation}</td>
            <td>{g.email}</td>
          </tr>
          <tr className={`collapse div_row_du${g.id}`} id={`div_row_du${g.id}`}>
            <td colSpan="5">
              <Panel>
                <Panel.Heading>
                  <Panel.Title>
                    Device: [{g.name}] managed by following users/groups <br />
                  </Panel.Title>
                </Panel.Heading>
                <Table>
                  <tbody>
                    {g.users.map((u, i) => (
                      <tr key={`row_${g.id}_${u.id}`} id={`row_${g.id}_${u.id}`} style={{ backgroundColor: '#c4e3f3' }}>
                        <td width="5%">{i + 1}</td>
                        <td width="30%">{u.name}</td>
                        <td width="10%">{u.initials}</td>
                        <td width="20%">{u.type}</td>
                        <td width="15%">{}</td>
                        <td width="20%">{ this.renderDeleteButton('Device', 'Person', g, u) }</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Panel>
            </td>
          </tr>
        </tbody>
      ));
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title>
            Device List &nbsp; ({devices.length}) &nbsp;
            <Button bsStyle="default" onClick={() => this.handleShowCreateModal('Device')}>Add New Device</Button>
          </Panel.Title>
        </Panel.Heading>
        <Table responsive condensed hover>
          <thead>
            <tr style={{ backgroundColor: '#ddd' }}>
              <th width="4%">#</th>
              <th width="28%">Actions</th>
              <th width="28%">Name</th>
              <th width="12%">Kürzel</th>
              <th width="28%">Email</th>
            </tr>
          </thead>
          { tbody }
        </Table>
      </Panel>
    );
  }

  renderDeleteButton(rootType, actionType, groupRec, userRec, isRoot = false) {
    let msg = 'remove yourself from the group';
    if (rootType === 'Group' && isRoot) {
      msg = `remove group: ${groupRec.name}`;
    } else if (rootType === 'Device' && isRoot) {
      msg = `remove device: ${groupRec.name}`;
    } else if (rootType === 'Group' && !isRoot && actionType === 'Person') {
      msg = `remove user: ${userRec.name} from group: ${groupRec.name} ?`;
    } else if (rootType === 'Group' && !isRoot && actionType === 'Device') {
      msg = `remove device: ${userRec.name} from group: ${groupRec.name} ?`;
    } else if (rootType === 'Device' && !isRoot) {
      msg = `remove user: ${userRec.name} from group: ${groupRec.name} ?`;
    } else {
      msg = `remove ???: ${groupRec.name}`;
    }

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg} <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.confirmDelete(rootType, actionType, groupRec, userRec, isRoot)}>
          Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.handleClick} >
          No
          </Button>
        </div>
      </Popover>
    );

    return (
      <ButtonGroup className="actions">
        <OverlayTrigger
          animation
          placement="right"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button bsSize="xsmall" bsStyle="danger" >
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }

  renderDeviceButtons(device) {
    return (
      <td>
        <ButtonGroup aria-label="Device-Users">
          <OverlayTrigger placement="top" overlay={<Tooltip id="deviceUsersShow">List Device-Users</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="info" data-toggle="collapse" data-target={`.div_row_du${device.id}`} >
              <i className="fa fa-users" />&nbsp;({device.users.length < 10 ? `0${device.users.length}` : device.users.length})
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device permission to users</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.handleShowModal(device, 'Device', 'Person')} >
              <i className="fa fa-user" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device permission to groups</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.handleShowModal(device, 'Device', 'Group')} >
              <i className="fa fa-users" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>&nbsp;&nbsp;

        <ButtonGroup>
          {this.renderDeleteButton('Device', null, device, null, true)}
        </ButtonGroup>
      </td>
    );
  }

  renderGroupButtons(group) {
    return (
      <td>
        <ButtonGroup aria-label="Group-Users">
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersShow">List Group-Users</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="info" data-toggle="collapse" data-target={`.div_row_${group.id}`} >
              <i className="fa fa-users" />&nbsp;({group.users.length < 10 ? `0${group.users.length}` : group.users.length})
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add user to group</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.handleShowModal(group, 'Group', 'Person')} >
              <i className="fa fa-user" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>&nbsp;&nbsp;

        <ButtonGroup>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupDevicesShow">List Group-Devices</Tooltip>}>
            <Button bsSize="xsmall" type="button" bsStyle="success" data-toggle="collapse" data-target={`.div_row_d${group.id}`} >
              <i className="fa fa-server" />&nbsp;({group.devices.length < 10 ? `0${group.devices.length}` : group.devices.length})
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add device to group</Tooltip>}>
            <Button bsSize="xsmall" type="button" onClick={() => this.handleShowModal(group, 'Group', 'Device')} >
              <i className="fa fa-laptop" /><i className="fa fa-plus" />
            </Button>
          </OverlayTrigger>
        </ButtonGroup>&nbsp;&nbsp;
        <ButtonGroup>
          {this.renderDeleteButton('Group', null, group, null, true)}
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
          {this.renderDeleteButton('Group', 'Person', group, user)}
        </ButtonGroup>
        &nbsp;&nbsp;
      </td>
    );
  }

  renderCreateModal() {
    const { showCreateModal, rootType } = this.state;
    const title = (rootType === 'Group') ? 'Add new group' : 'Add new device';
    return (
      <Modal
        show={showCreateModal}
        onHide={this.handleCloseGroup}
      >
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Panel bsStyle="success">
            <Panel.Heading>
              <Panel.Title>
                {title}
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              <Form>
                <FormGroup controlId="formInlineName">
                  <ControlLabel>Name*</ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.firstInput = m; }}
                    placeholder="eg: AK"
                  />
                </FormGroup>
                <FormGroup controlId="formInlineName">
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.lastInput = m; }}
                    placeholder="J. Moriarty"
                  />
                </FormGroup>&nbsp;&nbsp;
                <FormGroup controlId="formInlineNameAbbr">
                  <ControlLabel>Name abbreviation* </ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.abbrInput = m; }}
                    placeholder="AK-JM"
                  />
                </FormGroup>&nbsp;&nbsp;
                <FormGroup controlId="formInlineEmail">
                  <ControlLabel>Email</ControlLabel>&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.emailInput = m; }}
                    placeholder="eg: abc@kit.edu"
                  />
                </FormGroup>
                <Button bsSize="xsmall" bsStyle="success" onClick={() => this.createGroup()}>
                  Create new { rootType === 'Group' ? 'group' : 'device' }
                </Button>
              </Form>
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    );
  }

  renderModal() {
    const {
      showModal,
      root,
      rootType,
      actionType,
      selectedUsers
    } = this.state;
    let title = '';
    switch (rootType) {
      case 'Group':
        if (actionType === 'Person') {
          title = `Add users to group: ${root.name}`;
        } else {
          title = `Add devices to group: ${root.name}`;
        }
        break;
      case 'Device':
        if (actionType === 'Person') {
          title = `Add permission on device: ${root.name} to users`;
        } else {
          title = `Add permission on device: ${root.name} to groups`;
        }
        break;
      default:
        break;
    }

    return (
      <Modal
        show={showModal}
        onHide={this.handleClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Panel bsStyle="success">
            <Panel.Heading>
              <Panel.Title>
                {title}
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              <Select.Async
                multi
                isLoading
                backspaceRemoves
                value={selectedUsers}
                valueKey="value"
                labelKey="label"
                matchProp="name"
                placeholder="Select ..."
                promptTextCreator={this.promptTextCreator}
                loadOptions={this.loadUserByNameType}
                onChange={this.handleSelectUser}
              />
              <Button bsSize="small" type="button" bsStyle="warning" onClick={() => this.addToRoot(root)}>Add</Button>
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    return (
      <div className="list-container-bottom">
        { this.renderGroups() }
        { this.renderDevices() }
        { this.renderModal() }
        { this.renderCreateModal() }
      </div>
    );
  }
}
