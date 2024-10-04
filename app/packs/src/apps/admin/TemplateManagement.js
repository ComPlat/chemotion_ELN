import React from 'react';
import {
  Table, Button, Modal, Form, Tooltip,
  OverlayTrigger, Popover, Card, Container
} from 'react-bootstrap';
import ReportTemplateFetcher from 'src/fetchers/ReportTemplateFetcher';
import Dropzone from 'react-dropzone';
import { Select } from 'src/components/common/Select';

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
        <div>
          {template.attachment.filename}
          <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o"></i>
          </Button>
        </div>
      );
    } else if (attachment) {
      return (
        <div>
          {attachment.name}
          <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o"></i>
          </Button>
        </div>
      );
    } else {
      return (
        <Dropzone
          accept="application/pdf,.docx,.xlsx,.html,.csv,.erb"
          onDrop={attachment_file => this.handleFileDrop(attachment_file)}
          className='d-flex align-items-center justify-content-center dnd-zone'
        >
          <div className='text-center pt-3 text-secondary fs-6'>
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
        centered
        show={this.state.showNewTemplateModal}
        onHide={this.handleNewTemplateClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>New Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Form>
              <Form.Group controlId="formControlName" className='mb-3'>
                <Form.Label className='fs-6'>Name:</Form.Label>
                <Form.Control type="text" name="templateName" ref={(ref) => { this.templateName = ref; }} />
              </Form.Group>
              <Form.Group controlId="formControlReportTemplateType" className='mb-3'>
                <Form.Label className='fs-6'>Type:</Form.Label>
                <Select
                  options={this.state.reportTemplateTypes}
                  value={this.state.templateType}
                  isClearable
                  onChange={this.onTemplateTypeChange}
                />
              </Form.Group>
              <Form.Group controlId="formControlAttachment" className='mb-1'>
                <Form.Label className='fs-6'>File:</Form.Label>
                {this.dropzoneOrfilePreview()}
              </Form.Group>
            </Form>
          </Container>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <Button variant="primary" onClick={() => this.handleCreateNewTemplate()} >
            Create
            <i className="fa fa-plus ms-1" />
          </Button>
          <Button variant="warning" className='ms-1' onClick={() => this.handleNewTemplateClose()} >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  renderEditTemplateModal() {
    const { template } = this.state;

    return (
      <Modal
        centered
        show={this.state.showEditUserModal}
        onHide={this.handleEditTemplateClose}
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Template</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <Form>
              <Form.Group controlId="formControlName" className='mb-3'>
                <Form.Label className='fs-6'>Name:</Form.Label>
                <Form.Control type="text" name="templateName" defaultValue={template.name} ref={(ref) => { this.templateName = ref; }} />
              </Form.Group>
              <Form.Group controlId="formControlReportTemplateType" className='mb-3'>
                <Form.Label className='fs-6'>Type:</Form.Label>
                <Select
                  options={this.state.reportTemplateTypes}
                  value={this.state.templateType}
                  isClearable
                  onChange={this.onTemplateTypeChange}
                />
              </Form.Group>
              <Form.Group controlId="formControlAttachment" className='mb-3'>
                <Form.Label className='fs-6'>File:</Form.Label>
                {this.dropzoneOrfilePreview()}
              </Form.Group>
            </Form>
          </Container>
        </Modal.Body>
        <Modal.Footer className="modal-footer border-0">
          <Button variant="primary" className="me-2" onClick={() => this.handleUpdateTemplate(template.id)} >
            Update
            <i className="fa fa-save ms-1" />
          </Button>
          <Button variant="warning" className="me-2" onClick={() => this.handleEditTemplateClose()} >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  renderDeleteButton(template) {
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        <Popover.Header id="popover-positioned-scrolling-left" as="h5">
          Delete this template?
        </Popover.Header>
        <Popover.Body>
          <Button size="sm" variant="danger" className='me-1' onClick={() => this.handleDeleteTemplate(template)}>
            Yes
          </Button>
          <Button size="sm" variant="warning" onClick={this.handleClick} >
            No
          </Button>
        </Popover.Body>
      </Popover>
    );

    return (
      <div className="actions d-inline-block">
        <OverlayTrigger
          animation
          placement="right"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button size="sm" variant="danger" >
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  render() {
    const { templates } = this.state;

    const tcolumn = (
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Report Type</th>
        <th>ID</th>
        <th>Actions</th>
      </tr>
    )

    const tbody = templates.map((g, idx) => (
      <tr key={`row_${g.id}`}>
        <td>
          {idx + 1}
        </td>
        <td> {g.name} </td>
        <td> {this.state.reportTemplateTypes.find(({ value }) => value === g.report_type).label} </td>
        <td> {g.id} </td>
        <td>
          <OverlayTrigger placement="bottom" overlay={editTooltip} >
            <Button
              size="sm"
              variant="info"
              onClick={() => this.handleEditTemplateShow(g.id)}
              className='me-2'
            >
              <i className="fa fa-user" />
            </Button>
          </OverlayTrigger>
          <div className="d-inline-block">
            {this.renderDeleteButton(g)}
          </div>
        </td>
      </tr>
    ));

    return (
      <Container fluid className='fs-5'>
        <Card>
          <Card.Body>
            <Button variant="primary" size="md" onClick={() => this.handleNewTemplateShow()}>
              Add new template <i className="fa fa-plus ms-1" />
            </Button>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <Table hover responsive>
            <thead>
              {tcolumn}
            </thead>
            <tbody>
              {tbody}
            </tbody>
          </Table>
          </Card.Body>
        </Card>
        {this.renderNewTemplateModal()}
        {this.renderEditTemplateModal()}
      </Container>
    );
  }
}
