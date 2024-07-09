import React from 'react';
import {
  Panel, Table, Button, Modal, FormGroup, ControlLabel, Col, FormControl, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';

const editTip = <Tooltip id="inchi_tooltip">edit third party app</Tooltip>;
const newTip = <Tooltip id="inchi_tooltip">create new third party app</Tooltip>;
const deleteTip = <Tooltip id="inchi_tooltip">delete third party app</Tooltip>;

export default class ThirdPartyApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showMsgModal: false,
      showMsgModalEdit: false,
      showMsgModalDelete: false,
      messageNewThirdPartyAppModal: '',
      thirdPartyApps: [],
      errorMessage: '',
      currentName: '',
      currentIP: '',
      currentFileTypes: '',
      currentID: ''
    };
    this.closeNewThirdPartyAppModal = this.closeNewThirdPartyAppModal.bind(this);
    this.closeEditThirdPartyAppModal = this.closeEditThirdPartyAppModal.bind(this);
    this.closeDeleteThirdPartyAppModal = this.closeDeleteThirdPartyAppModal.bind(this);
  }

  componentDidMount() {
    this.thirdPartyApps();
  }

  thirdPartyApps() {
    ThirdPartyAppFetcher.fetchThirdPartyApps()
      .then((result) => {
        this.setState({
          thirdPartyApps: result
        });
      });
  }

  newApp(name, url, fileTypes) {
    ThirdPartyAppFetcher.createOrUpdateThirdPartyApp(null, name, url, fileTypes)
      .then((result) => {
        if (result.error) {
          this.setState({ messageNewThirdPartyAppModal: result.error });
          return false;
        }
        this.thirdPartyApps();
        return true;
      });
    return true;
  }

  edit(name, url, fileTypes) {
    return ThirdPartyAppFetcher.createOrUpdateThirdPartyApp(
      this.state.currentID,
      name,
      url,
      fileTypes
    )
      .then((result) => {
        if (result.error) {
          return this.thirdPartyApps().then((res) => {
            res.messageNewThirdPartyAppModal = result.error;
            this.setState(res);
            return false;
          });
        }
        return true;
      });
  }

  delete(id) {
    ThirdPartyAppFetcher.deleteThirdPartyApp(
      id
    )
      .then((result) => {
        if (result.error) {
          this.setState({ messageNewThirdPartyAppModal: result.error });
          return false;
        }
        this.thirdPartyApps();
        return true;
      });
    this.setState({
      showMsgModalDelete: false
    });
    return true;
  }

  showNewThirdPartyAppModal() {
    this.setState({
      showMsgModal: true
    });
  }

  showEditThirdPartyAppModal(key) {
    const { thirdPartyApps } = this.state;
    // select app by key from thirdPartyApps
    const app = thirdPartyApps.find((tpa) => tpa.id === key);
    this.setState({
      showMsgModalEdit: true,
      currentName: app?.name,
      currentIP: app?.url,
      currentFileTypes: app?.file_types,
      currentID: key
    });
  }

  showDeleteThirdPartyAppModal(key) {
    this.setState({
      showMsgModalDelete: true,
      currentID: key
    });
  }

  closeNewThirdPartyAppModal() {
    this.setState({
      showMsgModal: false,
      errorMessage: null,
    });
  }

  closeEditThirdPartyAppModal() {
    this.setState({
      showMsgModalEdit: false
    });
  }

  closeDeleteThirdPartyAppModal() {
    this.setState({
      showMsgModalDelete: false
    });
  }

  checkInput(name, ip, fileTypes) {
    const { thirdPartyApps, currentID } = this.state;
    let appId = 0;
    if (name.length < 1) {
      this.setState({
        errorMessage: 'Name is shorter than 1 character'
      });
      return false;
    }

    if (fileTypes.length == 0) {
      this.setState({
        errorMessage: 'File type has to have at least one letter'
      });
      return false;
    }

    if ((ip.slice(0, 7) !== 'http://')
      && (ip.slice(0, 8) !== 'https://')) {
      this.setState({
        errorMessage: 'URL should start with http:// or https://'
      });
      return false;
    }
    // check if name is already used
    if (thirdPartyApps.find((tpa) => { appId = tpa.id; return currentID !== tpa.id && tpa.name === name; })) {
      this.setState({
        errorMessage: `Name is already used by app with id: ${appId}`
      });
      return false;
    }
    // check if url is already used
    if (thirdPartyApps.find((tpa) => { appId = tpa.id; return currentID !== tpa.id && tpa.url === ip; })) {
      this.setState({
        errorMessage: `URL already used by app with id: ${appId}`
      });
      return false;
    }
    return true;
  }

  renderDeleteThirdPartyAppModal() {
    const { showMsgModalDelete, currentName, currentID } = this.state;
    return (
      <Modal
        show={showMsgModalDelete}
        onHide={this.closeDeleteThirdPartyAppModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete third party app</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <p>
              <strong>
                {` Do you really want to delete ${currentName}?`}
              </strong>
            </p>

            <OverlayTrigger placement="bottom" overlay={deleteTip}>
              <Button bsStyle="danger" bsSize="small" onClick={() => this.delete(currentID)}>
                Delete&nbsp;
                <i className="fa fa" />
              </Button>
            </OverlayTrigger>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderEditThirdPartyAppModal() {
    let nameRef = null;
    let urlRef = null;
    let fileTypesRef = null;

    const handleEdit = () => {
      const url = urlRef.value?.trim();
      const name = nameRef.value?.trim();
      const fileTypes = this.state.currentFileTypes.trim();

      if (this.checkInput(name, url, fileTypes)) {
        this.edit(name, url, fileTypes)
          .then(() => {
            this.closeEditThirdPartyAppModal();
            this.thirdPartyApps();
          })
          .catch(() => {});
      }
    };

    const handleNameChange = (event) => {
      // if current errorMessage start with Name, clear it
      const newState = { currentName: event.target.value };
      if (this.state.errorMessage.startsWith('Name')) {
        newState.errorMessage = '';
      }
      this.setState(newState);
    };

    const handleIPChange = (event) => {
      const newState = { currentIP: event.target.value };
      if (this.state.errorMessage.startsWith('URL')) {
        newState.errorMessage = '';
      }
      this.setState(newState);
    };

    const handleFileTypesChange = (event) => {
      const newFileTypes = event.target.value;
      const newState = { currentFileTypes: newFileTypes };
      if (this.state.errorMessage && this.state.errorMessage.startsWith('FileTypes')) {
        newState.errorMessage = '';
      }
      this.setState(newState);
    };

    return (
      <Modal
        show={this.state.showMsgModalEdit}
        onHide={this.closeEditThirdPartyAppModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit third party app</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <FormGroup controlId="formControlName">
              <Col componentClass={ControlLabel} sm={3}>
                Name:
              </Col>
              <Col sm={9}>
                <FormControl
                  type="text"
                  name="Name"
                  value={this.state.currentName}
                  onChange={handleNameChange}
                  inputRef={(ref) => { nameRef = ref; }}
                />
              </Col>
            </FormGroup>

            <FormGroup controlId="formControlIPAdress">
              <Col componentClass={ControlLabel} sm={3}>
                IP address:
              </Col>
              <Col sm={9}>
                <FormControl type="text" name="IP address" value={this.state.currentIP} onChange={handleIPChange} inputRef={(ref) => { urlRef = ref; }} />
              </Col>
            </FormGroup>

            <FormGroup controlId="formControlFileType">
              <Col componentClass={ControlLabel} sm={3}>
                File types:
              </Col>
              <Col sm={9}>
                <FormControl type="text" name="File types" value={this.state.currentFileTypes} onChange={handleFileTypesChange} inputRef={(ref) => { fileTypesRef = ref; }} />
              </Col>
            </FormGroup>

            <OverlayTrigger placement="bottom" overlay={editTip}>
              <Button bsStyle="primary" bsSize="small" onClick={handleEdit}>
                Update&nbsp;
                <i className="fa fa" />
              </Button>
            </OverlayTrigger>

            <Modal.Footer>
              <FormGroup controlId="formControlMessage">
                <FormControl type="text" readOnly name="messageNewUserModal" value={this.state.errorMessage} />
              </FormGroup>
            </Modal.Footer>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderMessageModal() {
    let nameRef = null;
    let urlRef = null;
    let fileTypesRef = null;

    const handleCreate = () => {
      const url = urlRef.value;
      const name = nameRef.value;
      const fileTypes = fileTypesRef.value.trim();
      if (this.checkInput(name, url, fileTypes)) {
        this.newApp(name, url, fileTypes);
        this.closeNewThirdPartyAppModal();
      }
    };

    return (
      <Modal
        show={this.state.showMsgModal}
        onHide={this.closeNewThirdPartyAppModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Create new third party app</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">

            <FormGroup controlId="formControlName">
              <Col componentClass={ControlLabel} sm={3}>
                Name:
              </Col>
              <Col sm={9}>
                <FormControl type="text" name="Name" inputRef={(ref) => { nameRef = ref; }} />
              </Col>
            </FormGroup>

            <FormGroup controlId="formControlIPAdress">
              <Col componentClass={ControlLabel} sm={3}>
                IP address:
              </Col>
              <Col sm={9}>
                <FormControl type="text" name="IP address" inputRef={(ref) => { urlRef = ref; }} />
              </Col>
            </FormGroup>

            <FormGroup controlId="formControlFileTypes">
              <Col componentClass={ControlLabel} sm={3}>
                File types:
              </Col>
              <Col sm={9}>
                <FormControl type="text" name="File types" inputRef={(ref) => { fileTypesRef = ref; }} />
              </Col>
            </FormGroup>

            <OverlayTrigger placement="bottom" overlay={newTip}>
              <Button bsStyle="primary" bsSize="small" onClick={() => handleCreate()}>
                Create&nbsp;
                <i className="fa fa-plus" />
              </Button>
            </OverlayTrigger>

            <Modal.Footer>
              <FormGroup controlId="formControlMessage">
                <FormControl type="text" readOnly name="messageNewUserModal" value={this.state.errorMessage} />
              </FormGroup>
            </Modal.Footer>

          </div>
        </Modal.Body>
      </Modal>
    );
  }

  render() {
    return (
      <div>

        <Panel>

          <Button bsStyle="primary" bsSize="small" onClick={() => this.showNewThirdPartyAppModal()}>
            New ThirdPartyApp&nbsp;
            <i className="fa fa-plus" />
          </Button>
          {this.renderMessageModal()}

        </Panel>

        <Table>
          <thead>
            <tr>
              <th>Actions</th>
              <th>Name</th>
              <th>IP address</th>
              <th>File types</th>
              <th>ID</th>
            </tr>
          </thead>

          <tbody>

            {this.state.thirdPartyApps.map((entry) => (
              <tr key={entry.id}>

                <td>

                  <OverlayTrigger placement="bottom" overlay={editTip}>
                    <Button bsStyle="info" bsSize="xsmall" onClick={() => this.showEditThirdPartyAppModal(entry.id)}>
                      Edit&nbsp;
                    </Button>
                  </OverlayTrigger>

                  {this.renderEditThirdPartyAppModal()}

                  <OverlayTrigger placement="bottom" overlay={deleteTip}>
                    <Button bsStyle="danger" bsSize="xsmall" onClick={() => this.showDeleteThirdPartyAppModal(entry.id)}>
                      <i className="fa fa-trash-o" aria-hidden="true" />
                    </Button>
                  </OverlayTrigger>

                  {this.renderDeleteThirdPartyAppModal()}

                </td>

                <td>{entry.name}</td>
                <td>{entry.url}</td>
                <td>{entry.file_types}</td>
                <td>{entry.id}</td>
              </tr>
            ))}

          </tbody>
        </Table>

        <h2>{this.state.messageNewThirdPartyAppModal}</h2>

      </div>
    );
  }
}
