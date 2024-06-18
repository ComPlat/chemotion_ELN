import React from 'react';
import { Modal, Panel, Table, Button, FormGroup, ControlLabel, Form, FormControl } from 'react-bootstrap';
import Select from 'react-select';
import { findIndex, filter } from 'lodash';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import AdminDeviceFetcher from 'src/fetchers/AdminDeviceFetcher';
import { selectUserOptionFormater, selectDeviceOptionFormater } from 'src/utilities/selectHelper';

import AdminGroupElement from 'src/apps/admin/AdminGroupElement';

export default class GroupsDevices extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      showModal: false,
      showCreateModal: false,
      rootType: '', // Group
      actionType: 'Person', // Person Group Device Adm
      root: {},
    };
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.loadUserByNameType = this.loadUserByNameType.bind(this);
    this.handleShowModal = this.handleShowModal.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleShowCreateModal = this.handleShowCreateModal.bind(this);
    this.handleCloseGroup = this.handleCloseGroup.bind(this);
    this.handleGroupChange = this.handleGroupChange.bind(this);
  }

  componentDidMount() {
    this.fetch('Group');
  }

  handleGroupChange() {
    this.fetch('Group');
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

  fetchDevices() {
    AdminDeviceFetcher.fetchDevices()
      .then((result) => {
        this.setState({
          devices: result.devices
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

    if (actionType == 'Device') {
      return AdminDeviceFetcher.fetchDevicesByName(input)
        .then((res) => selectDeviceOptionFormater({ data: res, withType: false }))
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    } else {
      return AdminFetcher.fetchUsersByNameType(input, actionType)
        .then((res) => selectUserOptionFormater({ data: res, withType: false }))
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }    
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
            this.fetchDevices();
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
            this.fetchDevices();
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
    let tbody = null;
    if (Object.keys(groups).length <= 0) {
      tbody = null;
    } else {
      tbody = groups.map((g, idx) => (
        <AdminGroupElement
          groupElement={g}
          index={idx}
          currentState={this.state}
          onChangeGroupData={this.handleGroupChange}
          onShowModal={this.handleShowModal}
          key={`group-element-key-component-${idx}`}
        />
      ));
    }

    return (
      <Panel key="group-panel-key">
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
          {tbody}
        </Table>
      </Panel>
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
                  Create new {rootType === 'Group' ? 'group' : 'device'}
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
        {this.renderGroups()}
        {this.renderModal()}
        {this.renderCreateModal()}
      </div>
    );
  }
}
