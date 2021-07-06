import React from 'react';
import { Panel, Table, FormGroup, Checkbox, FormControl, Button, Modal, Col, Form, Tooltip, OverlayTrigger, InputGroup } from 'react-bootstrap';
import uuid from 'uuid';
import Select from 'react-select';
import JSONInput from 'react-json-editor-ajrm';
import AdminFetcher from '../components/fetchers/AdminFetcher';
import NotificationActions from '../components/actions/NotificationActions';

const editTooltip = <Tooltip id="edit_tooltip">Edit Permission</Tooltip>;
const jsonTooltip = <Tooltip id="edit_tooltip">Edit JSON</Tooltip>;
const Notification = props =>
  (
    NotificationActions.add({
      title: props.title,
      message: props.msg,
      level: props.lvl,
      position: 'tc',
      dismissible: 'button',
      uid: uuid.v4()
    })
  );

export default class MatrixManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      matrices: [],
      matrice: {},
      showEditModal: false,
      showJsonModal: false,
      showJsonBtn: false,
      includeUsers: null,
      excludeUsers: null
    };
    this.edit = this.edit.bind(this);
    this.editJson = this.editJson.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleIncludeUser = this.handleIncludeUser.bind(this);
    this.handleExcludeUser = this.handleExcludeUser.bind(this);
    this.loadUserByName = this.loadUserByName.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleJsonSave = this.handleJsonSave.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleJsonClose = this.handleJsonClose.bind(this);
    this.onChangeJson = this.onChangeJson.bind(this);
  }

  componentDidMount() {
    this.fetchMatrices();
  }

  onChangeJson(e) {
    const { matrice } = this.state;
    if (e.error === false) {
      matrice.configs = e.jsObject;
      this.setState({ matrice, showJsonBtn: true });
    }
  }

  fetchMatrices() {
    AdminFetcher.fetchMatrices()
      .then((result) => {
        this.setState({ matrices: result.matrices });
      });
  }

  edit(matrice) {
    this.setState({
      showEditModal: true, showJsonModal: false, matrice, includeUsers: null, excludeUsers: null
    });
  }

  editJson(matrice) {
    this.setState({
      showJsonModal: true, showEditModal: false, matrice
    });
  }

  handleChange(val, e) {
    const { matrice } = this.state;
    matrice.enabled = (val === true);
    this.setState({
      matrice
    });
  }

  handleIncludeUser(val) {
    if (val) { this.setState({ includeUsers: val }); }
  }

  handleExcludeUser(val) {
    if (val) { this.setState({ excludeUsers: val }); }
  }

  loadUserByName(input) {
    if (!input) {
      return Promise.resolve({ options: [] });
    }
    return AdminFetcher.fetchUserGroupByName(input)
      .then((res) => {
        const usersEntries = res.users.map(u => ({
          value: u.id,
          name: u.name,
          label: `${u.name} (${u.abb})`
        }));
        return { options: usersEntries };
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleSave(matrice) {
    const { includeUsers, excludeUsers } = this.state;

    const params = {
      id: matrice.id,
      label: this.m_label.value.trim(),
      enabled: matrice.enabled,
    };

    if (includeUsers != null) {
      params.include_ids = includeUsers && includeUsers.map(u => u.value);
    }

    if (excludeUsers != null) {
      params.exclude_ids = excludeUsers && excludeUsers.map(u => u.value);
    }

    AdminFetcher.updateMatrice(params)
      .then((result) => {
        if (result.error) {
          Notification({ title: `Function [${matrice.name}]`, lvl: 'error', msg: result.error });
          return false;
        }
        Notification({ title: `Function [${matrice.name}]`, lvl: 'info', msg: 'Updated successfully' });
        this.setState({ showEditModal: false, includeUsers: null, excludeUsers: null, matrice: {} });
        this.m_label.value = '';
        this.fetchMatrices();
        return true;
      });
  }


  handleJsonSave(matrice) {
    AdminFetcher.updateMatriceJson({ id: matrice.id, configs: matrice.configs })
      .then((result) => {
        if (result.error) {
          Notification({ title: `Function [${matrice.name}]`, lvl: 'error', msg: result.error });
          return false;
        }
        Notification({ title: `Function [${matrice.name}]`, lvl: 'info', msg: 'JSON Configuration updated successfully' });
        this.setState({ showJsonModal: false, showJsonBtn: false, matrice: {} });
        this.fetchMatrices();
        return true;
      });
  }

  handleClose() {
    this.setState({ showEditModal: false });
  }

  handleJsonClose() {
    this.setState({ showJsonModal: false });
  }

  renderList() {
    const { matrices } = this.state;
    const tbody = matrices && matrices.map((e, idx) => (
      <tbody key={`tbody_${e.id}`}>
        <tr key={`row_${e.id}`} id={`row_${e.id}`} style={{ fontWeight: 'bold' }}>
          <td>{idx + 1}</td>
          <td>
            <OverlayTrigger placement="bottom" overlay={editTooltip} >
              <Button
                bsSize="xsmall"
                bsStyle="info"
                onClick={() => this.edit(e)}
              >
                <i className="fa fa-pencil-square-o" />
              </Button>
            </OverlayTrigger>
            &nbsp;
            <OverlayTrigger placement="bottom" overlay={jsonTooltip} >
              <Button
                bsSize="xsmall"
                bsStyle="warning"
                onClick={() => this.editJson(e)}
              >
                <i className="fa fa-cog" />
              </Button>
            </OverlayTrigger>
            &nbsp;
          </td>
          <td>{e.id}</td>
          <td>{e.name}</td>
          <td>{e.label}</td>
          <td>{e.enabled === true ? 'true' : 'false'}</td>
          <td>{e.include_users.map(u => u.label).join(', ')}</td>
          <td>{e.exclude_users.map(u => u.label).join(', ')}</td>
        </tr>
      </tbody>
    ))

    return (
      <Panel>
        <Panel.Heading>
          <Table responsive condensed hover>
            <thead>
              <tr style={{ backgroundColor: '#ddd' }}>
                <th width="2%">#</th>
                <th width="5%">Actions</th>
                <th width="3%">ID</th>
                <th width="10%">Function name</th>
                <th width="10%">Description</th>
                <th width="10%">Set globally</th>
                <th width="40%">Enabled for</th>
                <th width="20%">Disabled for</th>
              </tr>
            </thead>
            {tbody}
          </Table>
        </Panel.Heading>
      </Panel>
    );
  }

  renderEditModal() {
    const { matrice, includeUsers, excludeUsers } = this.state;
    let defaultIncludeUsers = [];
    let defaultExcludeUsers = [];

    if (includeUsers == null) {
      defaultIncludeUsers = matrice.include_users;
    } else {
      defaultIncludeUsers = includeUsers;
    }
    if (excludeUsers == null) {
      defaultExcludeUsers = matrice.exclude_users;
    } else {
      defaultExcludeUsers = excludeUsers;
    }

    return (
      <Modal show={this.state.showEditModal} onHide={this.handleClose}>
        <Modal.Header closeButton><Modal.Title>Edit Permisson</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Form horizontal className="input-form">
              <FormGroup controlId="formControlId">
                <InputGroup>
                  <InputGroup.Addon>ID</InputGroup.Addon>
                  <FormControl type="text" defaultValue={matrice.id} readOnly />
                </InputGroup>
              </FormGroup>
              <FormGroup controlId="formControlName">
                <InputGroup>
                  <InputGroup.Addon>Function name</InputGroup.Addon>
                  <FormControl type="text" defaultValue={matrice.name} readOnly />
                </InputGroup>
              </FormGroup>
              <FormGroup controlId="formControlLabel">
                <InputGroup>
                  <InputGroup.Addon>Description</InputGroup.Addon>
                  <FormControl type="text" defaultValue={matrice.label} inputRef={(ref) => { this.m_label = ref; }} />
                </InputGroup>
              </FormGroup>
              <FormGroup controlId="formControlLabel">
                <Checkbox inline type="checkbox" checked={matrice.enabled} onChange={e => this.handleChange(!matrice.enabled, e)}>Enable globally <br /> (when [checked], all users can see/use this feature, when [unchecked], only allowed users can see/use this function)</Checkbox>
              </FormGroup>
              <FormGroup controlId="formControlInclude">
                <InputGroup>
                  <InputGroup.Addon>Include Users</InputGroup.Addon>
                  <Select.Async
                    multi
                    isLoading
                    backspaceRemoves
                    value={defaultIncludeUsers}
                    defaultValue={defaultIncludeUsers}
                    valueKey="value"
                    labelKey="label"
                    matchProp="name"
                    placeholder="Select ..."
                    loadOptions={this.loadUserByName}
                    onChange={this.handleIncludeUser}
                  />
                </InputGroup>
              </FormGroup>
              <FormGroup controlId="formControlExclude">
                <InputGroup>
                  <InputGroup.Addon>Exclude Users</InputGroup.Addon>
                  <Select.Async
                    multi
                    isLoading
                    backspaceRemoves
                    value={defaultExcludeUsers}
                    defaultValue={defaultExcludeUsers}
                    valueKey="value"
                    labelKey="label"
                    matchProp="name"
                    placeholder="Select ..."
                    loadOptions={this.loadUserByName}
                    onChange={this.handleExcludeUser}
                  />
                </InputGroup>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="warning" onClick={() => this.handleClose()} >
                    Cancel&nbsp;
                  </Button>
                  &nbsp;
                  <Button bsStyle="primary" onClick={() => this.handleSave(matrice)} >
                    Update&nbsp;
                    <i className="fa fa-save" />
                  </Button>
                </Col>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }


  renderJsonModal() {
    const { matrice, showJsonBtn } = this.state;

    return (
      <Modal show={this.state.showJsonModal} onHide={this.handleJsonClose}>
        <Modal.Header closeButton><Modal.Title>JSON Configurations</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Form horizontal className="input-form">
              <FormGroup controlId="formControlId">
                <InputGroup>
                  <InputGroup.Addon>ID</InputGroup.Addon>
                  <FormControl type="text" defaultValue={matrice.id} readOnly />
                </InputGroup>
              </FormGroup>
              <FormGroup controlId="formControlName">
                <InputGroup>
                  <InputGroup.Addon>Function name</InputGroup.Addon>
                  <FormControl type="text" defaultValue={matrice.name} readOnly />
                </InputGroup>
              </FormGroup>
              <FormGroup controlId="formControlJson">
                <JSONInput
                  placeholder={matrice.configs}
                  width="100%"
                  onChange={e => this.onChangeJson(e)}
                />
              </FormGroup>

              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="warning" onClick={() => this.handleJsonClose()} >
                    Cancel&nbsp;
                  </Button>
                  &nbsp;
                  <Button bsStyle="primary" disabled={!showJsonBtn} onClick={() => this.handleJsonSave(matrice)} >
                    Update&nbsp;
                    <i className="fa fa-save" />
                  </Button>
                </Col>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    return (
      <div>
        {this.renderList()}
        {this.renderEditModal()}
        {this.renderJsonModal()}
      </div>
    );
  }
}