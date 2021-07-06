import React from 'react';
import { Panel, Table, Button, Modal, FormGroup, ControlLabel, Form, Col, ButtonGroup, Tooltip, OverlayTrigger, Popover, FormControl } from 'react-bootstrap';
import ReportTemplateFetcher from '../components/fetchers/ReportTemplateFetcher';
import Dropzone from 'react-dropzone';
import Select from 'react-select';

const editTooltip = <Tooltip id="inchi_tooltip">Edit this template</Tooltip>;

export default class TemplateManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      templates: [],
      template: {},
      attachment: null,
      showNewTemplateModal: false,
      deletingTooltip: false,
      templateType: null,
      reportTemplateTypes:
        [
          { label: 'Standard', value: 'standard' },
          { label: 'Supporting Information', value: 'supporting_information' },
          { label: 'Supporting Information - Standard Reaction', value: 'supporting_information_std_rxn' },
          { label: 'Supporting Information - Spectra', value: 'spectrum' },
          { label: 'Supporting Information - Reaction List (.xlsx)', value: 'rxn_list_xlsx' },
          { label: 'Supporting Information - Reaction List (.csv)', value: 'rxn_list_csv' },
          { label: 'Supporting Information - Reaction List (.html)', value: 'rxn_list_html' }
        ],
      showEditTemplateModal: false,
    };
    this.handleFetchTemplates = this.handleFetchTemplates.bind(this);
    this.handleNewTemplateShow = this.handleNewTemplateShow.bind(this);
    this.handleNewTemplateClose = this.handleNewTemplateClose.bind(this);
    this.handleCreateNewTemplate = this.handleCreateNewTemplate.bind(this);
    this.handleFileDrop = this.handleFileDrop.bind(this);
    this.renderDeleteButton = this.renderDeleteButton.bind(this);
    this.onTemplateTypeChange = this.onTemplateTypeChange.bind(this);
    this.handleEditTemplateShow = this.handleEditTemplateShow.bind(this);
    this.handleEditTemplateClose = this.handleEditTemplateClose.bind(this);
    this.handleUpdateTemplate = this.handleUpdateTemplate.bind(this);
  }

  componentDidMount() {
    this.handleFetchTemplates();
    return true;
  }

  componentWillUnmount() {
  }

  handleNewTemplateShow() {
    this.setState({
      showNewTemplateModal: true
    });
  }

  handleNewTemplateClose() {
    this.setState({
      showNewTemplateModal: false,
      template: {},
      attachment: null,
      templateType: null,
    });
  }

  handleEditTemplateShow(id) {
    ReportTemplateFetcher.fetchTemplateById(id)
      .then((result) => {
        this.setState({
          showEditUserModal: true,
          template: result.template,
          templateType: result.template.report_type
        });
      });
  }

  handleEditTemplateClose() {
    this.setState({
      showEditUserModal: false,
      template: {},
      templateType: null,
    });
  }

  handleFetchTemplates() {
    ReportTemplateFetcher.fetchTemplates()
      .then((result) => {
        this.setState({
          templates: result.templates
        });
      });
  }

  handleCreateNewTemplate() {
    let params = {
      attachment: this.state.attachment,
      name: this.templateName.value.trim(),
      report_type: this.state.templateType?.value
    }

    ReportTemplateFetcher.createTemplate(params)()
      .then(() => {
        this.handleFetchTemplates();
      })

    this.handleNewTemplateClose();
    return true;
  }

  handleUpdateTemplate(id) {
    let params = {
      id: id,
      attachment: this.state.attachment,
      name: this.templateName.value.trim(),
      report_type: this.state.templateType?.value,
      attachment_id: this.state.template.attachment_id,
    }

    if (!params.report_type) {
      params.report_type = this.state.templateType;
    }

    ReportTemplateFetcher.updateTemplate(params)()
      .then(() => {
        this.handleFetchTemplates();
      })

    this.handleEditTemplateClose();
    return true;
  }

  handleFileDrop(attachment_file) {
    this.setState({ attachment: attachment_file[0] });
  }

  handleAttachmentRemove() {
    let newTemplate = this.state.template;
    newTemplate.attachment = null;
    newTemplate.attachment_id = null;
    this.setState({ template: newTemplate, attachment: null });
  }

  handleDeleteTemplate(template) {
    ReportTemplateFetcher.deleteAttachment(template)
      .then(() => {
        this.handleFetchTemplates();
      })

    return true;
  }

  dropzoneOrfilePreview() {
    const { template, attachment } = this.state;
    if (template.attachment_id) {
      return (
        <div className="control-label">
          {template.attachment.filename} &nbsp;
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o"></i>
          </Button>
        </div>
      );
    } else if (attachment) {
      return (
        <div className="control-label">
          {attachment.name} &nbsp;
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o"></i>
          </Button>
        </div>
      );
    } else {
      return (
        <Dropzone
          accept="application/pdf,.docx,.xlsx,.html,.csv,.erb"
          onDrop={attachment_file => this.handleFileDrop(attachment_file)}
          style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
        >
          <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
            Drop File, or Click to Select.
          </div>
        </Dropzone>
      );
    }
  }

  onTemplateTypeChange(e) {
    this.setState({ templateType: e })
  };

  renderNewTemplateModal() {

    return (
      <Modal
        show={this.state.showNewTemplateModal}
        onHide={this.handleNewTemplateClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>New Template</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
            <Form horizontal>
              <FormGroup controlId="formControlName">
                <Col componentClass={ControlLabel} sm={2}>
                  Name:
                </Col>
                <Col sm={10}>
                  <FormControl type="text" name="templateName" inputRef={(ref) => { this.templateName = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlReportTemplateType">
                <Col componentClass={ControlLabel} sm={2}>
                  Type:
                </Col>
                <Col sm={10}>
                  <Select
                    options={this.state.reportTemplateTypes}
                    value={this.state.templateType}
                    clearable={true}
                    onChange={this.onTemplateTypeChange}
                  />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlAttachment">
                <Col componentClass={ControlLabel} sm={2}>
                  File:
                </Col>
                <Col sm={10}>
                  {this.dropzoneOrfilePreview()}
                </Col>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="primary" onClick={() => this.handleCreateNewTemplate()} >
                    Create&nbsp;
                    <i className="fa fa-plus" />
                  </Button>
                  &nbsp;
                  <Button bsStyle="warning" onClick={() => this.handleNewTemplateClose()} >
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

  renderEditTemplateModal() {
    const { template } = this.state;

    return (
      <Modal
        show={this.state.showEditUserModal}
        onHide={this.handleEditTemplateClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Template</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-9">
            <Form horizontal>
              <FormGroup controlId="formControlName">
                <Col componentClass={ControlLabel} sm={2}>
                  Name:
                </Col>
                <Col sm={10}>
                  <FormControl type="text" name="templateName" defaultValue={template.name} inputRef={(ref) => { this.templateName = ref; }} />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlReportTemplateType">
                <Col componentClass={ControlLabel} sm={2}>
                  Type:
                </Col>
                <Col sm={10}>
                  <Select
                    options={this.state.reportTemplateTypes}
                    value={this.state.templateType}
                    clearable={true}
                    onChange={this.onTemplateTypeChange}
                  />
                </Col>
              </FormGroup>
              <FormGroup controlId="formControlAttachment">
                <Col componentClass={ControlLabel} sm={2}>
                  File:
                </Col>
                <Col sm={10}>
                  {this.dropzoneOrfilePreview()}
                </Col>
              </FormGroup>
              <FormGroup>
                <Col smOffset={0} sm={10}>
                  <Button bsStyle="primary" onClick={() => this.handleUpdateTemplate(template.id)} >
                    Update&nbsp;
                    <i className="fa fa-save" />
                  </Button>
                  &nbsp;
                  <Button bsStyle="warning" onClick={() => this.handleEditTemplateClose()} >
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

  renderDeleteButton(template) {
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        Delete this template? <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleDeleteTemplate(template)}>
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
    const { templates } = this.state;

    const tcolumn = (
      <tr style={{ height: '26px', verticalAlign: 'middle' }}>
        <th width="1%">#</th>
        <th width="30%">Name</th>
        <th width="30%">Report Type</th>
        <th width="2%">ID</th>
        <th width="30%">Actions</th>
      </tr>
    )

    const tbody = templates.map((g, idx) => (
      <tr key={`row_${g.id}`} style={{ height: '26px', verticalAlign: 'middle' }}>
        <td width="1%">
          {idx + 1}
        </td>
        <td width="30%"> {g.name} </td>
        <td width="30%"> {this.state.reportTemplateTypes.find(({ value }) => value === g.report_type).label} </td>
        <td width="2%"> {g.id} </td>
        <td width="12%">
          <OverlayTrigger placement="bottom" overlay={editTooltip} >
            <Button
              bsSize="xsmall"
              bsStyle="info"
              onClick={() => this.handleEditTemplateShow(g.id)}
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
          <Button bsStyle="primary" bsSize="small" onClick={() => this.handleNewTemplateShow()}>
            Add new template&nbsp;<i className="fa fa-plus" />
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
        { this.renderNewTemplateModal()}
        { this.renderEditTemplateModal()}
      </div>
    );
  }
}
