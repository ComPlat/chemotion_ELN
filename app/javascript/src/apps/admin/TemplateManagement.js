import React from 'react';
import PropTypes from 'prop-types';
import {
  Table, Button, Form, Tooltip,
  OverlayTrigger, Popover, Card, Container
} from 'react-bootstrap';
import { FormattedMessage, injectIntl } from 'react-intl';
import AppModal from 'src/components/common/AppModal';
import ReportTemplateFetcher from 'src/fetchers/ReportTemplateFetcher';
import Dropzone from 'react-dropzone';
import { Select } from 'src/components/common/Select';

const editTooltip = (
  <Tooltip id="inchi_tooltip"><FormattedMessage id="template_management-edit_tooltip" /></Tooltip>
);

const REPORT_TEMPLATE_TYPE_KEYS = [
  { value: 'standard', id: 'template_management-type_standard' },
  { value: 'supporting_information', id: 'template_management-type_supporting_information' },
  { value: 'supporting_information_std_rxn', id: 'template_management-type_supporting_information_std_rxn' },
  { value: 'spectrum', id: 'template_management-type_spectrum' },
  { value: 'rxn_list_xlsx', id: 'template_management-type_rxn_list_xlsx' },
  { value: 'rxn_list_csv', id: 'template_management-type_rxn_list_csv' },
  { value: 'rxn_list_html', id: 'template_management-type_rxn_list_html' },
];

class TemplateManagement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      templates: [],
      template: {},
      attachment: null,
      showNewTemplateModal: false,
      templateType: null,
      showEditUserModal: false,
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
    const { attachment, templateType } = this.state;
    const params = {
      attachment,
      name: this.templateName.value.trim(),
      report_type: templateType?.value,
    };

    ReportTemplateFetcher.createTemplate(params)()
      .then(() => {
        this.handleFetchTemplates();
      });

    this.handleNewTemplateClose();
    return true;
  }

  handleUpdateTemplate(id) {
    const { attachment, templateType, template } = this.state;
    const params = {
      id,
      attachment,
      name: this.templateName.value.trim(),
      report_type: templateType?.value,
      attachment_id: template.attachment_id,
    };

    if (!params.report_type) {
      params.report_type = templateType;
    }

    ReportTemplateFetcher.updateTemplate(params)()
      .then(() => {
        this.handleFetchTemplates();
      });

    this.handleEditTemplateClose();
    return true;
  }

  handleFileDrop(attachmentFile) {
    this.setState({ attachment: attachmentFile[0] });
  }

  handleAttachmentRemove() {
    this.setState((prevState) => {
      const newTemplate = { ...prevState.template, attachment: null, attachment_id: null };
      return { template: newTemplate, attachment: null };
    });
  }

  handleDeleteTemplate(template) {
    ReportTemplateFetcher.deleteAttachment(template)
      .then(() => {
        this.handleFetchTemplates();
      });
    return true;
  }

  onTemplateTypeChange(e) {
    this.setState({ templateType: e });
  }

  getReportTemplateTypes() {
    const { intl } = this.props;
    return REPORT_TEMPLATE_TYPE_KEYS.map(({ value, id }) => ({
      value,
      label: intl.formatMessage({ id }),
    }));
  }

  dropzoneOrfilePreview() {
    const { template, attachment } = this.state;
    if (template.attachment_id) {
      return (
        <div>
          {template.attachment.filename}
          <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o" />
          </Button>
        </div>
      );
    }
    if (attachment) {
      return (
        <div>
          {attachment.name}
          <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o" />
          </Button>
        </div>
      );
    }
    return (
      <Dropzone
        accept="application/pdf,.docx,.xlsx,.html,.csv,.erb"
        onDrop={(attachmentFile) => this.handleFileDrop(attachmentFile)}
        className="d-flex align-items-center justify-content-center dnd-zone"
      >
        <div className="text-center pt-3 text-lighten2 fs-6">
          <FormattedMessage id="template_management-drop_file" />
        </div>
      </Dropzone>
    );
  }

  renderNewTemplateModal() {
    const { showNewTemplateModal, templateType } = this.state;
    const { intl } = this.props;
    return (
      <AppModal
        show={showNewTemplateModal}
        onHide={this.handleNewTemplateClose}
        title={<FormattedMessage id="template_management-new_template" />}
        primaryActionLabel={intl.formatMessage({ id: 'create' })}
        onPrimaryAction={() => this.handleCreateNewTemplate()}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <Container>
          <Form>
            <Form.Group controlId="formControlName" className="mb-3">
              <Form.Label className="fs-6">{`${intl.formatMessage({ id: 'name' })}:`}</Form.Label>
              <Form.Control type="text" name="templateName" ref={(ref) => { this.templateName = ref; }} />
            </Form.Group>
            <Form.Group controlId="formControlReportTemplateType" className="mb-3">
              <Form.Label className="fs-6">{`${intl.formatMessage({ id: 'user_management-type' })}:`}</Form.Label>
              <Select
                options={this.getReportTemplateTypes()}
                value={templateType}
                isClearable
                onChange={this.onTemplateTypeChange}
              />
            </Form.Group>
            <Form.Group controlId="formControlAttachment" className="mb-1">
              <Form.Label className="fs-6">{`${intl.formatMessage({ id: 'file' })}:`}</Form.Label>
              {this.dropzoneOrfilePreview()}
            </Form.Group>
          </Form>
        </Container>
      </AppModal>
    );
  }

  renderEditTemplateModal() {
    const { template, showEditUserModal, templateType } = this.state;
    const { intl } = this.props;

    return (
      <AppModal
        show={showEditUserModal}
        onHide={this.handleEditTemplateClose}
        title={<FormattedMessage id="template_management-edit_template" />}
        primaryActionLabel={intl.formatMessage({ id: 'update' })}
        onPrimaryAction={() => this.handleUpdateTemplate(template.id)}
        closeLabel={<FormattedMessage id="cancel" />}
      >
        <Container>
          <Form>
            <Form.Group controlId="formControlName" className="mb-3">
              <Form.Label className="fs-6">{`${intl.formatMessage({ id: 'name' })}:`}</Form.Label>
              <Form.Control
                type="text"
                name="templateName"
                defaultValue={template.name}
                ref={(ref) => { this.templateName = ref; }}
              />
            </Form.Group>
            <Form.Group controlId="formControlReportTemplateType" className="mb-3">
              <Form.Label className="fs-6">{`${intl.formatMessage({ id: 'user_management-type' })}:`}</Form.Label>
              <Select
                options={this.getReportTemplateTypes()}
                value={templateType}
                isClearable
                onChange={this.onTemplateTypeChange}
              />
            </Form.Group>
            <Form.Group controlId="formControlAttachment" className="mb-3">
              <Form.Label className="fs-6">{`${intl.formatMessage({ id: 'file' })}:`}</Form.Label>
              {this.dropzoneOrfilePreview()}
            </Form.Group>
          </Form>
        </Container>
      </AppModal>
    );
  }

  renderDeleteButton(template) {
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        <Popover.Header id="popover-positioned-scrolling-left" as="h5">
          <FormattedMessage id="template_management-delete_confirm" />
        </Popover.Header>
        <Popover.Body>
          <Button size="sm" variant="danger" className="me-1" onClick={() => this.handleDeleteTemplate(template)}>
            <FormattedMessage id="yes" />
          </Button>
          <Button size="sm" variant="warning" onClick={this.handleClick}>
            <FormattedMessage id="no" />
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
          <Button size="sm" variant="danger">
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  render() {
    const { templates } = this.state;
    const reportTemplateTypes = this.getReportTemplateTypes();

    const tcolumn = (
      <tr>
        <th>#</th>
        <th><FormattedMessage id="name" /></th>
        <th><FormattedMessage id="template_management-report_type" /></th>
        <th><FormattedMessage id="id" /></th>
        <th><FormattedMessage id="actions" /></th>
      </tr>
    );

    const tbody = templates.map((g, idx) => {
      const matchedType = reportTemplateTypes.find(({ value }) => value === g.report_type);
      return (
        <tr key={`row_${g.id}`}>
          <td>
            {idx + 1}
          </td>
          <td>
            {' '}
            {g.name}
            {' '}
          </td>
          <td>
            {' '}
            {matchedType ? matchedType.label : g.report_type}
            {' '}
          </td>
          <td>
            {' '}
            {g.id}
            {' '}
          </td>
          <td>
            <OverlayTrigger placement="bottom" overlay={editTooltip}>
              <Button
                size="sm"
                variant="info"
                onClick={() => this.handleEditTemplateShow(g.id)}
                className="me-2"
              >
                <i className="fa fa-user" />
              </Button>
            </OverlayTrigger>
            <div className="d-inline-block">
              {this.renderDeleteButton(g)}
            </div>
          </td>
        </tr>
      );
    });

    return (
      <Container fluid className="fs-5">
        <Card>
          <Card.Body>
            <Button variant="primary" size="md" onClick={() => this.handleNewTemplateShow()}>
              <FormattedMessage id="template_management-add_new" />
              {' '}
              <i className="fa fa-plus ms-1" />
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

TemplateManagement.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(TemplateManagement);
