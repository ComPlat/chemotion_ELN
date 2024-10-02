import React from 'react';
import { Table, Button, Modal, Form, Tooltip, OverlayTrigger, InputGroup } from 'react-bootstrap';
import uuid from 'uuid';
import { AsyncSelect } from 'src/components/common/Select';
import JSONInput from 'react-json-editor-ajrm';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { selectUserOptionFormater } from 'src/utilities/selectHelper';

const editTooltip = <Tooltip id="edit_tooltip">Edit Permission</Tooltip>;
const jsonTooltip = <Tooltip id="edit_tooltip">Edit JSON</Tooltip>;
const Notification = (props) =>
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
      showEditModal: true,
      showJsonModal: false,
      matrice,
      includeUsers: matrice.include_users,
      excludeUsers: matrice.exclude_users,
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
    this.setState({ includeUsers: val });
  }

  handleExcludeUser(val) {
     this.setState({ excludeUsers: val });
  }

  loadUserByName(input) {
    if (!input) {
      return Promise.resolve({ options: [] });
    }
    return AdminFetcher.fetchUsersByNameType(input, 'Person,Group')
      .then((res) => selectUserOptionFormater({ data: res, withType: true }))
      .catch((errorMessage) => {
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

    params.include_ids = (includeUsers ?? []).map(u => u.value);
    params.exclude_ids = (excludeUsers ?? []).map(u => u.value);

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
    AdminFetcher.updateMatrice({ id: matrice.id, configs: matrice.configs })
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
        <tr key={`row_${e.id}`} id={`row_${e.id}`}
          // className='bg-light'
        >
          <td>{idx + 1}</td>
          <td>
            <OverlayTrigger placement="bottom" overlay={editTooltip} >
              <Button
                size="sm"
                variant="info"
                onClick={() => this.edit(e)}
                className='me-1'
              >
                <i className="fa fa-pencil-square-o" />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger placement="bottom" overlay={jsonTooltip} >
              <Button
                size="sm"
                variant="warning"
                onClick={() => this.editJson(e)}
                className='me-1'
              >
                <i className="fa fa-cog" />
              </Button>
            </OverlayTrigger>
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
      <div>
        <Table responsive condensed hover className="border">
          <thead>
            <tr className="bg-gray-200">
              <th>#</th>
              <th>Actions</th>
              <th>ID</th>
              <th>Function name</th>
              <th>Description</th>
              <th>Set globally</th>
              <th>Enabled for</th>
              <th>Disabled for</th>
            </tr>
          </thead>
          {tbody}
        </Table>
      </div>
    );
  }

  renderEditModal() {
    const { matrice, includeUsers, excludeUsers } = this.state;

    return (
      <Modal
        centered
        show={this.state.showEditModal}
        onHide={this.handleClose}
        backdrop='static'
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Permisson</Modal.Title>
        </Modal.Header>

        <Modal.Body className="overflow-auto">
          <Form className="row g-3">
            <Form.Group controlId="formControlId">
              <InputGroup>
                <InputGroup.Text>ID</InputGroup.Text>
                <Form.Control type="text" defaultValue={matrice.id} readOnly />
              </InputGroup>
            </Form.Group>
            <Form.Group controlId="formControlName">
              <InputGroup>
                <InputGroup.Text>Function name</InputGroup.Text>
                <Form.Control type="text" defaultValue={matrice.name} readOnly />
              </InputGroup>
            </Form.Group>
            <Form.Group controlId="formControlLabel">
              <InputGroup>
                <InputGroup.Text>Description</InputGroup.Text>
                <Form.Control type="text" defaultValue={matrice.label} ref={(ref) => { this.m_label = ref; }} />
              </InputGroup>
            </Form.Group>
            <Form.Group controlId="formControlLabel">
              <Form.Check
                inline
                type="checkbox"
                checked={matrice.enabled}
                onChange={e => this.handleChange(!matrice.enabled, e)}
                label='Enable globally'
                className="fs-5"
              />
              <p className='ms-3 fs-6'>
                (When [checked], all users can see/use this feature,
                when [unchecked], only allowed users can see/use this function)
              </p>
            </Form.Group>
            <Form.Group>
              <Form.Label>Include Users</Form.Label>
              <AsyncSelect
                isMulti
                value={includeUsers}
                matchProp="name"
                placeholder="Select..."
                loadOptions={this.loadUserByName}
                onChange={this.handleIncludeUser}
                menuPosition="fixed"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Exclude Users</Form.Label>
              <AsyncSelect
                isMulti
                value={excludeUsers}
                matchProp="name"
                placeholder="Select..."
                loadOptions={this.loadUserByName}
                onChange={this.handleExcludeUser}
                menuPosition="fixed"
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer className='modal-footer border-0'>
          <Button variant="warning" onClick={() => this.handleClose()} className='me-1' >
            Cancel
          </Button>
          <Button variant="primary" onClick={() => this.handleSave(matrice)} >
            Update
            <i className="fa fa-save ms-1" />
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  renderJsonModal() {
    const { matrice, showJsonBtn } = this.state;

    return (
      <Modal
        centered
        show={this.state.showJsonModal}
        onHide={this.handleJsonClose}
        backdrop='static'>
        <Modal.Header closeButton>
          <Modal.Title>JSON Configurations</Modal.Title>
        </Modal.Header>

        <Modal.Body className="overflow-auto">
          <Form className="row g-3">
            <Form.Group controlId="formControlId">
                <InputGroup>
                <InputGroup.Text>ID</InputGroup.Text>
                <Form.Control type="text" defaultValue={matrice.id} readOnly />
                </InputGroup>
            </Form.Group>
            <Form.Group controlId="formControlName">
                <InputGroup>
                <InputGroup.Text>Function name</InputGroup.Text>
                <Form.Control type="text" defaultValue={matrice.name} readOnly />
                </InputGroup>
            </Form.Group>
            <Form.Group controlId="formControlJson">
                <JSONInput
                  placeholder={matrice.configs}
                  width="100%"
                  onChange={e => this.onChangeJson(e)}
                />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer className='modal-footer border-0'>
          <Button variant="warning" onClick={() => this.handleJsonClose()} >
            Cancel
          </Button>
          <Button variant="primary" disabled={!showJsonBtn} onClick={() => this.handleJsonSave(matrice)} >
            Update
            <i className="fa fa-save ms-1" />
          </Button>
        </Modal.Footer>
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
