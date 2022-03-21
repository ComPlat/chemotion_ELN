import React from 'react';
import { Panel, Table, Button, Modal, FormGroup, ControlLabel, Form, Col, ButtonGroup, Tooltip, OverlayTrigger, Popover, FormControl } from 'react-bootstrap';
import PartnerAppFetcher from '../components/fetchers/PartnerAppFetcher';
import Dropzone from 'react-dropzone';
import Select from 'react-select';

const editTooltip = <Tooltip id="inchi_tooltip">Edit this partnerApp</Tooltip>;

export default class PartnerAppManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      partnerApps: [],
      partnerApp: {},
      attachment: null,
      showNewPartnerAppModal: false,
      deletingTooltip: false,
      showEditPartnerAppModal: false,
    };

    this.handleFetchPartnerApps = this.handleFetchPartnerApps.bind(this);
    this.handleNewPartnerAppShow = this.handleNewPartnerAppShow.bind(this);
    this.handleNewPartnerAppClose = this.handleNewPartnerAppClose.bind(this);
    this.handleCreateNewPartnerApp = this.handleCreateNewPartnerApp.bind(this);
    this.renderDeleteButton = this.renderDeleteButton.bind(this);
    this.handleEditPartnerAppShow = this.handleEditPartnerAppShow.bind(this);
    this.handleEditPartnerAppClose = this.handleEditPartnerAppClose.bind(this);
    this.handleUpdatePartnerApp = this.handleUpdatePartnerApp.bind(this);
  }

  componentDidMount() {
    this.handleFetchPartnerApps();
    return true;
  }

  componentWillUnmount() {
  }

  handleNewPartnerAppShow() {
    this.setState({
      showNewPartnerAppModal: true
    });
  }

  handleNewPartnerAppClose() {
    this.setState({
      partnerApp: {},
      showNewPartnerAppModal: false,
    });
  }

  handleEditPartnerAppShow(id) {
    PartnerAppFetcher.fetchPartnerAppById(id)
      .then((result) => {
        this.setState({
          showEditPartnerAppModal: true,
          partnerApp: result.partner_app,
        });
      });
  }

  handleEditPartnerAppClose() {
    this.setState({
      partnerApp: {},
      showEditPartnerAppModal: false,
    });
  }

  handleFetchPartnerApps() {
    PartnerAppFetcher.getPartnerApps()
      .then((result) => {
        this.setState({
          partnerApps: result.partner_apps
        });
      });
  }

  handleCreateNewPartnerApp() {
    let params = {
      name: this.name.value.trim(),
      url: this.url.value.trim(),
    }

    PartnerAppFetcher.createPartnerApp(params)()
      .then(() => {
        this.handleFetchPartnerApps();
      })

    this.handleNewPartnerAppClose();
    return true;
  }

  handleUpdatePartnerApp(id) {
    let params = {
      id: id,
      name: this.name.value.trim(),
      url: this.url.value.trim(),
    }

    PartnerAppFetcher.updatePartnerApp(params)()
      .then(() => {
        this.handleFetchPartnerApps();
      })

    this.handleEditPartnerAppClose();
    return true;
  }

  handleDeletePartnerApp(partnerApp) {
    PartnerAppFetcher.deletePartnerApp(partnerApp.id)
      .then(() => {
        this.handleFetchPartnerApps();
      })

    return true;
  }

  renderNewPartnerAppModal() {

    return (
      <Modal
        show={this.state.showNewPartnerAppModal}
        onHide={this.handleNewPartnerAppClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>New Partner App</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
            <Form horizontal>
              <FormGroup controlId="formControlName">
                <Col componentClass={ControlLabel} sm={2}>
                  Name:
                </Col>
                <Col sm={10}>
                  <FormControl type="text" name="name" inputRef={(ref) => { this.name = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlReportPartnerAppType">
                <Col componentClass={ControlLabel} sm={2}>
                  Url:
                </Col>
                <Col sm={10}>
                  <FormControl type="text" name="url" inputRef={(ref) => { this.url = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="primary" onClick={() => this.handleCreateNewPartnerApp()} >
                    Create&nbsp;
                    <i className="fa fa-plus" />
                  </Button>
                  &nbsp;
                  <Button bsStyle="warning" onClick={() => this.handleNewPartnerAppClose()} >
                    Cancel&nbsp;
                  </Button>
                </Col>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderEditPartnerAppModal() {
    const { partnerApp } = this.state;

    return (
      <Modal
        show={this.state.showEditPartnerAppModal}
        onHide={this.handleEditPartnerAppClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Partner App</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
            <Form horizontal>
              <FormGroup controlId="formControlName">
                <Col componentClass={ControlLabel} sm={2}>
                  Name:
                </Col>
                <Col sm={10}>
                  <FormControl type="text" name="name" defaultValue={partnerApp.name} inputRef={(ref) => { this.name = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlUrl">
                <Col componentClass={ControlLabel} sm={2}>
                Url:
                </Col>
                <Col sm={10}>
                  <FormControl type="text" name="url" defaultValue={partnerApp.url} inputRef={(ref) => { this.url = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="primary" onClick={() => this.handleUpdatePartnerApp(partnerApp.id)} >
                    Update&nbsp;
                    <i className="fa fa-save" />
                  </Button>
                  &nbsp;
                  <Button bsStyle="warning" onClick={() => this.handleEditPartnerAppClose()} >
                    Cancel&nbsp;
                  </Button>
                </Col>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  renderDeleteButton(partnerApp) {
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        Delete this partnerApp? <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleDeletePartnerApp(partnerApp)}>
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

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  render() {
    const { partnerApps } = this.state;

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="1%">#</th>
        <th width="30%">Name</th>
        <th width="30%">Url</th>
        <th width="30%">Actions</th>
      </tr>
    )

    const tbody = partnerApps.map((g, idx) => (
      <tr key={`row_${g.id}`} style={{ height: '26px', verticalAlign: 'middle' }}>
        <td width="1%">
          {g.id}
        </td>
        <td width="30%"> {g.name} </td>
        <td width="2%"> {g.url} </td>
        <td width="12%">
          <OverlayTrigger placement="bottom" overlay={editTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle="info"
              onClick={() => this.handleEditPartnerAppShow(g.id)}
            >
              <i className="fa fa-user" />
            </Button>
          </OverlayTrigger>
          <ButtonGroup>
            {this.renderDeleteButton(g)}
          </ButtonGroup>
          &nbsp;
        </td>
      </tr>
    ));

    return (
      <div>
        <Panel>
          <Button bsStyle="primary" bsSize="small" onClick={() => this.handleNewPartnerAppShow()}>
            Add new partner app&nbsp;<i className="fa fa-plus" />
          </Button>
          &nbsp;
        </Panel>
        <Panel>
          <Table>
            <thead>
              {tcolumn}
            </thead>
            <tbody>
              {tbody}
            </tbody>
          </Table>
        </Panel>
        { this.renderNewPartnerAppModal()}
        { this.renderEditPartnerAppModal()}
      </div>
    );
  }
}
