import React from 'react';
import { Panel, Table, Button, Modal, FormGroup, ControlLabel, Col, FormControl, Tooltip, OverlayTrigger } from 'react-bootstrap';
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
      tpaNotEmpty: true,
      errorMessageNewTPA: '',
      errorMessageEditTPA: '',
      thirdPartyAppNames: [""],
      currentName: '',
      currentIP: '',
      currentID: ''
    };
    this.thirdPartyApps();
    this.closeNewThirdPartyAppModal = this.closeNewThirdPartyAppModal.bind(this);
    this.closeEditThirdPartyAppModal = this.closeEditThirdPartyAppModal.bind(this);
    this.closeDeleteThirdPartyAppModal = this.closeDeleteThirdPartyAppModal.bind(this);
    this.toggleTPANotEmpty = this.toggleTPANotEmpty.bind(this);
  }

  toggleTPANotEmpty() {
    if (this.state.thirdPartyApps.length == 0) {
      this.setState(prevState => ({
        tpaNotEmpty: !prevState.tpaNotEmpty
      })
      );
    }
  }

  componentDidMount() {
    this.getThirdPartyAppNames();
  }

  thirdPartyApps() {
    ThirdPartyAppFetcher.fetchThirdPartyApps()
      .then((result) => {
        this.setState({
          thirdPartyApps: result
        });
      })
      .then(() => {
        if (this.state.thirdPartyApps.length == 0) {
          this.setState({
            tpaNotEmpty: false
          });
        }
      })
      .then(() => {
        this.toggleTPANotEmpty()
      });
  }

  new(name, IPAddress) {
    ThirdPartyAppFetcher.newThirdPartyApp(
      name,
      IPAddress)
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

  edit(name, IPAddress) {
    return ThirdPartyAppFetcher.editThirdPartyApp(
      this.state.currentID,
      name,
      IPAddress)
      .then((result) => {
        if (result.error) {
          return this.thirdPartyApps().then((res) => {
            res.messageNewThirdPartyAppModal = result.error
            this.setState(res);
            return false;
          });
        }
        return true;
      });
  }

  delete(id) {
    ThirdPartyAppFetcher.deleteThirdPartyApp(
      id)
      .then((result) => {
        if (result.error) {
          this.setState({ messageNewThirdPartyAppModal: result.error });
          return false;
        }
        this.thirdPartyApps();
        this.getThirdPartyAppNames();
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
    this.setState({
      showMsgModalEdit: true
    })
    this.getThirdPartyAppByID(key);
  }

  showDeleteThirdPartyAppModal(key) {
    this.setState({
      showMsgModalDelete: true,
      currentID: key
    });
    this.getThirdPartyAppByID(key);
  }

  closeNewThirdPartyAppModal() {
    this.setState({
      showMsgModal: false
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

  checkInput(name, ip) {
    return new Promise((resolve, reject) => {

    if (name.length < 1) {
      this.setState({
        errorMessageNewTPA: "name is shorter than 1 character"
      });
      reject();
    }

    if ((ip.slice(0, 7) != "http://") &&
      (ip.slice(0, 8) != "https://")) {
      this.setState({
        errorMessageNewTPA: "Begin of ip address has to be http:// or https://"
      });
      reject();
    }

    console.log("test1")

    ThirdPartyAppFetcher.isNameUnique(name)
      .then((result) => {
        const message = JSON.parse(result).message
        if (message == "Name is not unique") {
          this.setState({
            errorMessageNewTPA: "name is not unique"
          });
          reject();
        } else {
          resolve();
        }
      }) 

    })

  }

  getThirdPartyAppNames() {
    ThirdPartyAppFetcher.fetchThirdPartyAppNames()
      .then((result) => {
        this.setState({
          thirdPartyAppNames: result
        })
      })
      .then(() => {
        if (this.state.thirdPartyAppNames == null || !Array.isArray(this.state.thirdPartyAppNames) || this.state.thirdPartyAppNames.length === 0) {
          this.setState({
            thirdPartyAppNames: []
          })
        }
      });
  }

  getThirdPartyAppByID(key) {
    ThirdPartyAppFetcher.fetchThirdPartyAppByID(key)
      .then((result) => {
        this.setState({
          currentName: result.name,
          currentIP: result.IPAddress,
          currentID: key
        })
      });
  }

  renderDeleteThirdPartyAppModal() {
    return (
      <Modal
        show={this.state.showMsgModalDelete}
        onHide={this.closeDeleteThirdPartyAppModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete third party app</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <p><strong> Do you really want to delete {this.state.currentName}?</strong></p>

            <OverlayTrigger placement="bottom" overlay={deleteTip} >
              <Button bsStyle="danger" bsSize="small" onClick={() => this.delete(this.state.currentID)}>
                Delete&nbsp;<i className="fa fa" />
              </Button>
            </OverlayTrigger>
          </div>
        </Modal.Body>
      </Modal>
    )
  }


  renderEditThirdPartyAppModal() {

    let nameRef = null;
    let IPAddressRef = null;

    const handleEdit = () => {

      const IPAddress = IPAddressRef.value;
      const name = nameRef.value;
      this.checkInput(name, IPAddress)
        .then(() => {
          this.edit(name, IPAddress).then(() => {
            this.getThirdPartyAppNames();
            this.closeEditThirdPartyAppModal();
            this.thirdPartyApps();
          });
        })
        .catch(() => {
        })

    }

    const handleNameChange = (event) => {
      this.setState({
        currentName: event.target.value
      })
    }

    const handleIPChange = (event) => {
      this.setState({
        currentIP: event.target.value
      })
    }

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
                <FormControl type="text" name="Name" value={this.state.currentName} onChange={handleNameChange} inputRef={(ref) => { nameRef = ref; }} />
              </Col>
            </FormGroup>

            <FormGroup controlId="formControlIPAdress">
              <Col componentClass={ControlLabel} sm={3}>
                IP address:
              </Col>
              <Col sm={9}>
                <FormControl type="text" name="IP address" value={this.state.currentIP} onChange={handleIPChange} inputRef={(ref) => { IPAddressRef = ref; }} />
              </Col>
            </FormGroup>

            <OverlayTrigger placement="bottom" overlay={editTip} >
              <Button bsStyle="primary" bsSize="small" onClick={handleEdit}>
                Update&nbsp;<i className="fa fa" />
              </Button>
            </OverlayTrigger>

            <Modal.Footer>
              <FormGroup controlId="formControlMessage">
                <FormControl type="text" readOnly name="messageNewUserModal" value={this.state.errorMessageEditTPA} />
              </FormGroup>
            </Modal.Footer>
          </div>
        </Modal.Body>
      </Modal>
    )
  }

  renderMessageModal() {

    let nameRef = null;
    let IPAddressRef = null;

    const handleCreate = () => {

      this.getThirdPartyAppNames();
      const IPAddress = IPAddressRef.value;
      const name = nameRef.value;
      this.checkInput(name, IPAddress)
        .then(() => {
          this.new(name, IPAddress);
          this.closeNewThirdPartyAppModal();
        })
        .catch(() => {
        });

    }

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
                <FormControl type="text" name="IP address" inputRef={(ref) => { IPAddressRef = ref; }} />
              </Col>
            </FormGroup>

            <OverlayTrigger placement="bottom" overlay={newTip} >
              <Button bsStyle="primary" bsSize="small" onClick={() => handleCreate()}>
                Create&nbsp;<i className="fa fa-plus" />
              </Button>
            </OverlayTrigger>

            <Modal.Footer>
              <FormGroup controlId="formControlMessage">
                <FormControl type="text" readOnly name="messageNewUserModal" value={this.state.errorMessageNewTPA} />
              </FormGroup>
            </Modal.Footer>

          </div>
        </Modal.Body>
      </Modal>
    )
  }


  render() {

    return (
      <div>

        <Panel>

          <Button bsStyle="primary" bsSize="small" onClick={() => this.showNewThirdPartyAppModal()}>
            New ThirdPartyApp&nbsp;<i className="fa fa-plus" />
          </Button>
          {this.renderMessageModal()}

        </Panel>

        <Table>
          <thead>
            <tr>
              <th>Actions</th>
              <th>Name</th>
              <th>IP address</th>
              <th>ID</th>
            </tr>
          </thead>

          <tbody>

            {this.state.tpaNotEmpty && this.state.thirdPartyApps.map((entry) => (
              <tr key={entry.id}>

                <td>

                  <OverlayTrigger placement="bottom" overlay={editTip} >
                    <Button bsStyle="info" bsSize="xsmall" onClick={() => this.showEditThirdPartyAppModal(entry.id)}>
                      Edit&nbsp;
                    </Button>
                  </OverlayTrigger>

                  {this.renderEditThirdPartyAppModal()}

                  <OverlayTrigger placement="bottom" overlay={deleteTip} >
                    <Button bsStyle="danger" bsSize="xsmall" onClick={() => this.showDeleteThirdPartyAppModal(entry.id)}>
                      <i className="fa fa-trash-o" aria-hidden="true" />
                    </Button>
                  </OverlayTrigger>

                  {this.renderDeleteThirdPartyAppModal()}

                </td>

                <td>{entry.name}</td>
                <td>{entry.IPAddress}</td>
                <td>{entry.id}</td>
              </tr>
            )
            )}

          </tbody>
        </Table>

        <h2>{this.state.messageNewThirdPartyAppModal}</h2>

      </div>
    );

  }


}
