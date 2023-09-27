import React from 'react';
import {
  Alert, Modal, Panel, Table, Button, FormGroup, ControlLabel, Form, Tooltip, FormControl, OverlayTrigger, Col, Row
} from 'react-bootstrap';
import Select from 'react-select';
import { findIndex, filter } from 'lodash';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import DeviceFetcher from 'src/fetchers/DeviceFetcher';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

import AdminGroupElement from 'src/apps/admin/AdminGroupElement';
import AdminDeviceElement from 'src/apps/admin/AdminDeviceElement';
import { formatDate } from 'src/utilities/timezoneHelper';

export default class GroupsDevices extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      devices: [],
      showModal: false,
      showApiModal: false,
      showCreateModal: false,
      showDeviceMetadataModal: false,
      rootType: '', // Group, Device
      actionType: 'Person', // Person Group Device Adm
      root: {},
      device: {},
      deviceMetadata: {
        dates: []
      }
    };
    this.handleSelectUser = this.handleSelectUser.bind(this);
    this.loadUserByNameType = this.loadUserByNameType.bind(this);
    this.handleShowModal = this.handleShowModal.bind(this);
    this.handleShowDeviceMetadataModal = this.handleShowDeviceMetadataModal.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleCloseDeviceMetadata = this.handleCloseDeviceMetadata.bind(this);
    this.handleShowCreateModal = this.handleShowCreateModal.bind(this);
    this.handleCloseGroup = this.handleCloseGroup.bind(this);
    this.handleGroupChange = this.handleGroupChange.bind(this);
    this.handleDeviceChange = this.handleDeviceChange.bind(this);
    this.handleToggleDeviceSuper = this.handleToggleDeviceSuper.bind(this);
    this.onShowDeviceApiToken = this.onShowDeviceApiToken.bind(this);
  }

  componentDidMount() {
    this.fetch('Group');
    this.fetch('Device');
  }

  componentWillUnmount() {
  }

  handleGroupChange() {
    this.fetch('Group');
  }

  handleDeviceChange() {
    this.fetch('Device');
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
      .then(() => {
        if (setAdmin) {
          groupRec.admins.splice(1, 0, userRec);
        } else {
          const usrIdx = findIndex(groupRec.admins, (o) => o.id === userRec.id);
          groupRec.admins.splice(usrIdx, 1);
        }
        const idx = findIndex(groups, (o) => o.id === groupRec.id);
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

  updateDevices(id) {
    AdminFetcher.fetchGroupsDevices('Device')
      .then((result) => {
        const { devices } = this.state;
        const idx = devices.map((e) => e.id).indexOf(id);
        devices[idx] = result.list.find((e) => e.id === id);
        this.setState({
          devices
        });
      });
  }

  handlefetchDeviceMetadataByDeviceId(deviceID) {
    AdminFetcher.fetchDeviceMetadataByDeviceId(deviceID)
      .then((result) => {
        if (result.device_metadata) {
          this.setState({
            deviceMetadata: result.device_metadata
          });
        }
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
      showApiModal: false,
      rootType: '',
      token: '',
      actionType: '',
      root: {},
    });
  }

  handleShowDeviceMetadataModal(device) {
    this.setState({
      showDeviceMetadataModal: true,
      device
    });
    this.handlefetchDeviceMetadataByDeviceId(device.id);
  }

  handleCloseDeviceMetadata() {
    this.setState({
      showDeviceMetadataModal: false,
      device: {},
      deviceMetadata: {}
    });
  }

  deviceMetadataDoiExists() {
    const { deviceMetadata } = this.state;
    return deviceMetadata.doi;
  }

  handleShowCreateModal(rootType) {
    this.setState({
      showCreateModal: true,
      rootType
    });
  }

  handleToggleDeviceSuper(deviceId) {
    AdminFetcher.updateDevice(deviceId).then((data) => {
      this.updateDevices(deviceId);
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
      .then((res) => selectUserOptionFormater({ data: res, withType: false }))
      .catch((errorMessage) => {
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

  syncDeviceMetadataFromDataCite(deviceId) {
    AdminFetcher.postDeviceMetadata({
      doi: this.doi.value.trim(),
      device_id: deviceId
    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else if (result.device_metadata) {
        this.setState({
          deviceMetadata: result.device_metadata
        });
        this.doi.value = result.device_metadata.doi;
      }
    });
  }

  syncDeviceMetadataToDataCite(deviceId) {
    AdminFetcher.syncDeviceMetadataToDataCite({
      device_id: deviceId
    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else if (result.device_metadata) {
        this.setState({
          deviceMetadata: result.device_metadata
        });
      }
    });
  }

  saveDeviceMetadata(deviceId) {
    const { deviceMetadata } = this.state;
    // TODO: add Validations
    AdminFetcher.postDeviceMetadata({
      // TODO: add more Attributes:
      // t.string   "publisher"

      device_id: deviceId,
      data_cite_state: deviceMetadata.data_cite_state,
      url: this.url.value.trim(),
      landing_page: this.landing_page.value.trim(),
      name: this.name.value.trim(),
      description: this.description.value.trim(),
      publication_year: this.publication_year.value.trim(),
      dates: deviceMetadata.dates

    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else if (result.device_metadata) {
        this.setState({
          deviceMetadata: result.device_metadata
        });
      }
    });
  }

  addDeviceMetadataDate() {
    this.setState((state) => {
      const newDateItem = {
        date: '',
        dateType: ''
      };
      const { deviceMetadata } = state;
      const currentDates = deviceMetadata.dates ? deviceMetadata.dates : [];
      const newDates = currentDates.concat(newDateItem);
      deviceMetadata.dates = newDates;

      return {
        deviceMetadata
      };
    });
  }

  removeDeviceMetadataDate(index) {
    this.setState((state) => {
      const { deviceMetadata } = state;
      const currentDates = deviceMetadata.dates ? deviceMetadata.dates : [];
      currentDates.splice(index, 1);
      deviceMetadata.dates = currentDates;

      return deviceMetadata;
    });
  }

  updateDeviceMetadataDate(index, fieldname, value) {
    this.setState((state) => {
      const { deviceMetadata } = state;
      deviceMetadata.dates[index][fieldname] = value;

      return deviceMetadata;
    });
  }

  updateDeviceMetadataDataCiteState(value) {
    this.setState((state) => {
      const { deviceMetadata } = state;
      deviceMetadata.data_cite_state = value;

      return deviceMetadata;
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
                groups: filter(this.state.groups, (o) => o.id != groupRec.id),
              });
            } else {
              const idx = findIndex(groups, (o) => o.id === result.root.id);
              groups.splice(idx, 1, result.root);
              this.setState({ groups });
            }
            this.fetch('Device');
            break;
          case 'Device':
            if (isRoot === true) {
              this.setState({
                devices: filter(this.state.devices, (o) => o.id !== groupRec.id),
              });
            } else {
              const idx = findIndex(devices, (o) => o.id === result.root.id);
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
            idx = findIndex(groups, (o) => o.id === result.root.id);
            groups.splice(idx, 1, result.root);
            this.fetch('Device');
            break;
          case 'Device':
            idx = findIndex(devices, (o) => o.id === result.root.id);
            devices.splice(idx, 1, result.root);
            this.fetch('Group');
            break;
          default:
            break;
        }
        this.setState({ selectedUsers: null, showModal: false });
      });
  }

  onShowDeviceApiToken(device) {
    DeviceFetcher.fetchApiToken(device.id).then((res) => {
      const { token, exp_date } = res;
      this.setState({
        showApiModal: true,
        root: device,
        token,
        exp_date
      });
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
        <AdminGroupElement
          key={`AdminGroupElement-${g.name}`}
          groupElement={g}
          index={idx}
          currentState={this.state}
          onChangeGroupData={this.handleGroupChange}
          onShowModal={this.handleShowModal}
        />
      ));
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title>
            Group List &nbsp;
            (
            {groups.length}
            ) &nbsp;
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

  renderDevices() {
    const { devices } = this.state;

    let tbody = '';
    if (typeof (devices) !== 'undefined' && Object.keys(devices).length <= 0) {
      tbody = '';
    } else {
      tbody = devices && devices.map((device, idx) => (
        <AdminDeviceElement
          deviceElement={device}
          index={idx}
          currentState={this.state}
          onChangeDeviceData={this.handleDeviceChange}
          handleToggleDeviceSuper={this.handleToggleDeviceSuper}
          onShowModal={this.handleShowModal}
          onShowDeviceMetadataModal={this.handleShowDeviceMetadataModal}
          onShowDeviceApiToken={this.onShowDeviceApiToken}
        />
      ));
    }

    return (
      <Panel>
        <Panel.Heading>
          <Panel.Title>
            Device List &nbsp; (
            {devices.length}
            ) &nbsp;
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
                  <ControlLabel>Name*</ControlLabel>
&nbsp;&nbsp;
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
                </FormGroup>
&nbsp;&nbsp;
                <FormGroup controlId="formInlineNameAbbr">
                  <ControlLabel>Name abbreviation* </ControlLabel>
&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.abbrInput = m; }}
                    placeholder="AK-JM"
                  />
                </FormGroup>
&nbsp;&nbsp;
                <FormGroup controlId="formInlineEmail">
                  <ControlLabel>Email</ControlLabel>
&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.emailInput = m; }}
                    placeholder="eg: abc@kit.edu"
                  />
                </FormGroup>
                <Button bsSize="xsmall" bsStyle="success" onClick={() => this.createGroup()}>
                  Create new
                  {' '}
                  {rootType === 'Group' ? 'group' : 'device'}
                </Button>
              </Form>
            </Panel.Body>
          </Panel>
        </Modal.Body>
      </Modal>
    );
  }

  renderDeviceMetadataModal() {
    const { showDeviceMetadataModal, device, deviceMetadata } = this.state;
    const title = 'Edit Device Metadata';
    return (
      <Modal
        show={showDeviceMetadataModal}
        onHide={this.handleCloseDeviceMetadata}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Edit
            {device.name}
            {' '}
            Metadata
          </Modal.Title>
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
                {!this.deviceMetadataDoiExists()
                  && <p className="text-center">Get Metadata from DataCite</p>}
                <FormGroup controlId="metadataFormDOI">
                  <ControlLabel>DOI*</ControlLabel>
&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.doi}
                    inputRef={(m) => { this.doi = m; }}
                    placeholder="10.*****/**********"
                    readOnly={this.deviceMetadataDoiExists()}
                  />
                </FormGroup>
                {!this.deviceMetadataDoiExists()
                  && (
                  <Col smOffset={0} sm={12}>
                    <Button className="pull-right" bsStyle="danger" onClick={() => this.syncDeviceMetadataFromDataCite(device.id)}>
                      Sync from DataCite
                    </Button>
                  </Col>
                  )}
                {!this.deviceMetadataDoiExists()
                  && <p className="text-center">Or create Metadata and sync to DataCite</p>}

                <FormGroup controlId="metadataFormState">
                  <ControlLabel>State*</ControlLabel>
                  <FormControl
                    componentClass="select"
                    value={deviceMetadata.data_cite_state}
                    onChange={(event) => this.updateDeviceMetadataDataCiteState(event.target.value)}
                    inputRef={(m) => { this.dataCiteState = m; }}
                  >
                    <option value="draft">Draft</option>
                    <option value="registered">Registered</option>
                    <option value="findable">Findable</option>
                  </FormControl>
                </FormGroup>

                <FormGroup controlId="metadataFormURL">
                  <ControlLabel>URL*</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.url}
                    inputRef={(m) => { this.url = m; }}
                    placeholder="https://<device.url>"
                  />
                </FormGroup>

                <FormGroup controlId="metadataFormLandingPage">
                  <ControlLabel>Landing Page*</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.landing_page}
                    inputRef={(m) => { this.landing_page = m; }}
                    placeholder="https://<device.landing.page>"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormName">
                  <ControlLabel>Name*</ControlLabel>
&nbsp;&nbsp;
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.name}
                    inputRef={(m) => { this.name = m; }}
                    placeholder="Name"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormPublicationYear">
                  <ControlLabel>Publication Year*</ControlLabel>
                  <FormControl
                    type="number"
                    defaultValue={deviceMetadata.publication_year}
                    inputRef={(m) => { this.publication_year = m; }}
                    placeholder="Publication Year e.g. '2020'"
                  />
                </FormGroup>
                <FormGroup controlId="metadataFormDescription">
                  <ControlLabel>Description</ControlLabel>
                  <FormControl
                    type="text"
                    defaultValue={deviceMetadata.description}
                    inputRef={(m) => { this.description = m; }}
                    placeholder="Description"
                  />
                </FormGroup>

                <ControlLabel style={{ marginTop: 5 }}>Dates</ControlLabel>
                {deviceMetadata.dates && deviceMetadata.dates.map((dateItem, index) => (
                  <div key={dateItem.id}>
                    <Row>
                      <Col smOffset={0} sm={5}>
                        <FormGroup>
                          <ControlLabel>Date</ControlLabel>
                          <FormControl
                            type="text"
                            value={dateItem.date}
                            placeholder="Date e.g. '2020-01-01'"
                            onChange={(event) => this.updateDeviceMetadataDate(index, 'date', event.target.value)}
                          />
                        </FormGroup>
                      </Col>
                      <Col smOffset={0} sm={5}>
                        <FormGroup>
                          <ControlLabel>Date Type</ControlLabel>
                          <FormControl
                            type="text"
                            value={dateItem.dateType}
                            placeholder="DateType e.g. 'Created'"
                            onChange={(event) => this.updateDeviceMetadataDate(index, 'dateType', event.target.value)}
                          />
                        </FormGroup>
                      </Col>
                      <Col smOffset={0} sm={2}>
                        <ControlLabel>Action</ControlLabel>
                        <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeDeviceMetadataDate(index)}>
                          <i className="fa fa-trash-o" />
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Row>
                  <Col smOffset={0} sm={12}>
                    <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addDeviceMetadataDate()}>
                      <i className="fa fa-plus" />
                    </Button>
                  </Col>
                </Row>

                <Row>
                  <Col smOffset={0} sm={12}>
                    <p className="text-right">
                      DataCiteVersion:
                      {' '}
                      {deviceMetadata.data_cite_version}
                      <br />
                      DataCiteUpdatedAt:
                      {' '}
                      {formatDate(deviceMetadata.data_cite_updated_at)}
                      <br />
                    </p>
                  </Col>
                </Row>
              </Form>
            </Panel.Body>
          </Panel>
        </Modal.Body>
        <Modal.Footer>
          <Col smOffset={0} sm={6}>
            <Button className="pull-left" bsStyle="danger" onClick={() => this.syncDeviceMetadataToDataCite(device.id)}>
              Sync to DataCite
            </Button>
          </Col>
          <Col smOffset={0} sm={6}>
            <Button className="pull-right" bsStyle="success" onClick={() => this.saveDeviceMetadata(device.id)}>
              Save Device Metadata
            </Button>
          </Col>
        </Modal.Footer>
      </Modal>
    );
  }

  renderApiModal() {
    const {
      showApiModal,
      token,
      exp_date,
      root
    } = this.state;
    const title = `API key for Device ${root.name_abbreviation}`;
    return (
      <Modal
        show={showApiModal}
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
              You can view the token on this page only once. Please keep it somewhere safe.
              It expires at
              {' '}
              {exp_date}
              .
              <Alert
                style={{ overflow: 'auto', 'white-space': 'nowrap' }}
                variant="warning"
              >
                <input
                  className="form-control"
                  style={{
                    'background-color': 'rgba(0,0,0,0)',
                    border: 'none'
                  }}
                  type="text"
                  value={token}
                />
              </Alert>
              <Button
                bsSize="small"
                type="button"
                bsStyle="warning"
                onClick={() => this.setState({
                  showApiModal: false,
                  token: ''
                })}
              >
                Close
              </Button>
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
        {this.renderDevices()}
        {this.renderModal()}
        {this.renderCreateModal()}
        {this.renderApiModal()}
        {this.renderDeviceMetadataModal()}
      </div>
    );
  }
}
