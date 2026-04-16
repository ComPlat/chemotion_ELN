import React from 'react';
import Delta from 'quill-delta';
import { Badge, Button, Card, Col, Container, Form, Nav, Row } from 'react-bootstrap';

import QuillEditor from 'src/components/QuillEditor';
import TextTemplateIcon from 'src/apps/admin/textTemplates/TextTemplateIcon';
import TextTemplatesFetcher from 'src/fetchers/TextTemplatesFetcher';
import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

function TemplateListItem({ name, selected, onSelect, onRemove, readOnly }) {
  return (
    <div
      className={`d-flex align-items-center justify-content-between px-3 py-2 rounded mb-1 ${selected ? 'bg-primary text-white' : 'bg-light text-dark'}`}
      onClick={() => onSelect(name)}
      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
    >
      <span className="text-truncate me-2" style={{ maxWidth: 160 }}>
        {name || <em className="text-muted">Unnamed</em>}
      </span>
      {!readOnly && (
        <Button
          size="sm"
          variant={selected ? 'light' : 'outline-danger'}
          className="flex-shrink-0 p-0 px-1"
          style={{ lineHeight: 1.2 }}
          onClick={(e) => { e.stopPropagation(); onRemove(name); }}
          title="Delete template"
        >
          <i className="fa fa-trash" />
        </Button>
      )}
      {readOnly && (
        <i className={`fa fa-lock fa-fw small ${selected ? 'text-white-50' : 'text-muted'}`} title="Read only" />
      )}
    </div>
  );
}

class TemplateEditPanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name: props.template?.name ?? '',
      text: props.template?.data?.text ?? '',
      icon: props.template?.data?.icon ?? '',
    };

    this.reactQuillRef = React.createRef();
  }

  componentDidUpdate(prevProps) {
    const { template } = this.props;
    if (template !== prevProps.template) {
      this.setState({
        name: template?.name ?? '',
        text: template?.data?.text ?? '',
        icon: template?.data?.icon ?? '',
      });
    }
  }

  handleSave = () => {
    if (!this.reactQuillRef.current) return;

    const quill = this.reactQuillRef.current;
    const delta = quill.getContents();
    const deltaLength = delta.length();
    const removeTrailingNewline = new Delta().retain(deltaLength - 1).delete(1);
    const { ops } = delta.compose(removeTrailingNewline);

    const { template, onSave } = this.props;
    const { name, text, icon } = this.state;

    onSave({
      ...template,
      name: name.trim(),
      data: {
        ops,
        text: text.trim() === '' ? null : text.trim(),
        icon: icon.trim() === '' ? null : icon.trim(),
      },
    });
  };

  render() {
    const { template, readOnly } = this.props;
    const { name, text, icon } = this.state;

    const previewTemplate = {
      ...template,
      name,
      data: { ...template.data, text, icon },
    };

    return (
      <Card className="h-100 border-0">
        <Card.Header className="bg-white border-bottom py-3 px-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-semibold text-dark">
                {name ? `Editing "${name}"` : 'New Template'}
              </h5>
              {readOnly && <Badge bg="secondary" className="fw-normal">Read only</Badge>}
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small me-2">Preview</span>
              <TextTemplateIcon iconClass="fs-4" template={previewTemplate} />
            </div>
          </div>
        </Card.Header>
        <Card.Body className="px-4 py-3 overflow-auto">
          {readOnly && (
            <div className="alert alert-secondary d-flex align-items-center gap-2 py-2 mb-3">
              <i className="fa fa-lock" />
              <span className="small">You don&apos;t have permission to edit global templates.</span>
            </div>
          )}
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-medium text-muted small text-uppercase mb-1">Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => this.setState({ name: e.target.value })}
                    placeholder="Template name"
                    disabled={readOnly}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium text-muted small text-uppercase mb-1">Short Label</Form.Label>
                  <Form.Control
                    type="text"
                    value={text}
                    onChange={(e) => this.setState({ text: e.target.value })}
                    placeholder="e.g. NMR"
                    disabled={readOnly}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-medium text-muted small text-uppercase mb-1">Icon Class</Form.Label>
                  <Form.Control
                    type="text"
                    value={icon}
                    onChange={(e) => this.setState({ icon: e.target.value })}
                    placeholder="e.g. fa fa-flask"
                    disabled={readOnly}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label className="fw-medium text-muted small text-uppercase mb-1">Content</Form.Label>
              <QuillEditor
                ref={this.reactQuillRef}
                value={template.data}
                onChange={() => {}}
                disabled={readOnly}
              />
            </Form.Group>
          </Form>
        </Card.Body>
        {!readOnly && (
          <Card.Footer className="bg-white border-top py-3 px-4 d-flex justify-content-end">
            <Button variant="primary" onClick={this.handleSave}>
              <i className="fa fa-save me-2" />
              {template?.id ? 'Update Template' : 'Save Template'}
            </Button>
          </Card.Footer>
        )}
      </Card>
    );
  }
}

export default class MyTemplates extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'personal',
      // personal templates
      personalTemplateNames: [],
      fetchedPersonalTemplates: {},
      selectedPersonalName: null,
      // global templates (predefined) - populated from API later
      globalTemplateNames: [],
      fetchedGlobalTemplates: {},
      selectedGlobalName: null,
      // permission - will come from current_user API later
      canEditGlobal: false,
      errorMessage: null,
    };
  }

  componentDidMount() {
    UserStore.listen(this.onUserStoreChange);
    UserActions.fetchCurrentUser();

    TextTemplatesFetcher.fetchPersonalTemplates().then((templates) => {
      if (!templates) return;
      const personalTemplateNames = templates.map((t) => t.name);
      const fetchedPersonalTemplates = {};
      templates.forEach((t) => { fetchedPersonalTemplates[t.name] = t; });
      this.setState({ personalTemplateNames, fetchedPersonalTemplates });
    });

    TextTemplatesFetcher.fetchPredefinedTemplateNames().then((names) => {
      if (names) this.setState({ globalTemplateNames: names });
    });
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onUserStoreChange);
  }

  onUserStoreChange = (state) => {
    const canEditGlobal = state.currentUser?.global_text_template_editor === true;
    this.setState({ canEditGlobal });
  };

  // ── personal ──────────────────────────────────────────────

  addTemplate = () => {
    const { personalTemplateNames, fetchedPersonalTemplates } = this.state;
    if (personalTemplateNames.includes('')) return;

    this.setState({
      personalTemplateNames: ['', ...personalTemplateNames],
      fetchedPersonalTemplates: { ...fetchedPersonalTemplates, '': { name: '', data: {} } },
      selectedPersonalName: '',
    });
  };

  selectPersonalTemplate = (name) => {
    this.setState({ selectedPersonalName: name });
  };

  removePersonalTemplate = (name) => {
    const { personalTemplateNames, fetchedPersonalTemplates, selectedPersonalName } = this.state;
    const template = fetchedPersonalTemplates[name];

    const doRemove = () => {
      const updated = { ...fetchedPersonalTemplates };
      delete updated[name];
      this.setState({
        personalTemplateNames: personalTemplateNames.filter((n) => n !== name),
        fetchedPersonalTemplates: updated,
        selectedPersonalName: selectedPersonalName === name ? null : selectedPersonalName,
      });
    };

    if (template?.id) {
      TextTemplatesFetcher.deletePersonalTemplate(template.id).then((res) => {
        if (res) { doRemove(); TextTemplateActions.fetchPersonalTemplates(); }
      });
    } else {
      doRemove();
    }
  };

  updatePersonalTemplate = (template) => {
    const { personalTemplateNames, fetchedPersonalTemplates, selectedPersonalName } = this.state;
    const oldName = selectedPersonalName;
    const newName = template.name;

    const applyUpdate = (saved) => {
      const updated = { ...fetchedPersonalTemplates, [newName]: saved };
      if (oldName !== newName) delete updated[oldName];
      this.setState({
        personalTemplateNames: oldName !== newName
          ? personalTemplateNames.map((n) => (n === oldName ? newName : n))
          : personalTemplateNames,
        fetchedPersonalTemplates: updated,
        selectedPersonalName: newName,
      });
    };

    if (template.id) {
      TextTemplatesFetcher.updatePersonalTemplate(template).then((res) => {
        if (res?.error) { this.setState({ errorMessage: res.error }); return; }
        if (res) { this.setState({ errorMessage: null }); applyUpdate(res); TextTemplateActions.fetchPersonalTemplates(); }
      });
    } else {
      TextTemplatesFetcher.createPersonalTemplate(template).then((res) => {
        if (res?.error) { this.setState({ errorMessage: res.error }); return; }
        if (res) { this.setState({ errorMessage: null }); applyUpdate(res); TextTemplateActions.fetchPersonalTemplates(); }
      });
    }
  };

  // ── global ────────────────────────────────────────────────

  addGlobalTemplate = () => {
    const { globalTemplateNames, fetchedGlobalTemplates } = this.state;
    if (globalTemplateNames.includes('')) return;

    this.setState({
      globalTemplateNames: ['', ...globalTemplateNames],
      fetchedGlobalTemplates: { ...fetchedGlobalTemplates, '': { name: '', data: {} } },
      selectedGlobalName: '',
    });
  };

  selectGlobalTemplate = (name) => {
    const { fetchedGlobalTemplates, selectedGlobalName } = this.state;
    if (name === selectedGlobalName && fetchedGlobalTemplates[name]) return;

    if (fetchedGlobalTemplates[name]) {
      this.setState({ selectedGlobalName: name });
    } else {
      TextTemplatesFetcher.fetchPredefinedTemplateByNames([name]).then((res) => {
        if (!res) return;
        const newTemplates = {};
        res.forEach((r) => { newTemplates[r.name] = r; });
        this.setState((prev) => ({
          fetchedGlobalTemplates: { ...prev.fetchedGlobalTemplates, ...newTemplates },
          selectedGlobalName: name,
        }));
      });
    }
  };

  removeGlobalTemplate = (name) => {
    TextTemplatesFetcher.deletePredefinedTemplateByName(name).then((res) => {
      if (!res) return;
      const { globalTemplateNames, fetchedGlobalTemplates, selectedGlobalName } = this.state;
      const updated = { ...fetchedGlobalTemplates };
      delete updated[name];

      this.setState({
        globalTemplateNames: globalTemplateNames.filter((n) => n !== name),
        fetchedGlobalTemplates: updated,
        selectedGlobalName: selectedGlobalName === name ? null : selectedGlobalName,
      });
    });
  };

  updateGlobalTemplate = (template) => {
    const { fetchedGlobalTemplates, selectedGlobalName } = this.state;
    const oldName = selectedGlobalName;
    const newName = template.name;

    TextTemplatesFetcher.updatePredefinedTemplates(template).then((res) => {
      if (res?.error) { this.setState({ errorMessage: res.error }); return; }
      if (!res) return;
      this.setState({ errorMessage: null });
      const updated = { ...fetchedGlobalTemplates, [newName]: res };
      if (oldName !== newName) delete updated[oldName];

      this.setState({
        globalTemplateNames: oldName !== newName
          ? this.state.globalTemplateNames.map((n) => (n === oldName ? newName : n))
          : this.state.globalTemplateNames,
        fetchedGlobalTemplates: updated,
        selectedGlobalName: newName,
      });
    });
  };

  // ── render ────────────────────────────────────────────────

  render() {
    const {
      activeTab,
      personalTemplateNames, fetchedPersonalTemplates, selectedPersonalName,
      globalTemplateNames, fetchedGlobalTemplates, selectedGlobalName,
      canEditGlobal, errorMessage,
    } = this.state;

    const isPersonal = activeTab === 'personal';
    const selectedTemplate = isPersonal
      ? fetchedPersonalTemplates[selectedPersonalName]
      : fetchedGlobalTemplates[selectedGlobalName];

    return (
      <Container fluid className="d-flex flex-column py-3 px-4" style={{ height: '100vh', overflow: 'hidden' }}>
        <div className="d-flex align-items-center mb-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => window.history.back()}
            className="me-3 d-flex align-items-center gap-1"
          >
            <i className="fa fa-arrow-left" />
            Back
          </Button>
          <h4 className="fw-bold">Templates</h4>
          <span className="ms-2 text-muted small">All text templates for reactions and analyses</span>
        </div>

        <Row className="flex-grow-1" style={{ minHeight: 0 }}>
          {/* Left panel */}
          <Col md={3} className="d-flex flex-column h-100 border-end pe-0">
            {/* Tabs */}
            <Nav variant="tabs" className="px-2 pt-1 bg-white border-bottom" activeKey={activeTab} onSelect={(k) => this.setState({ activeTab: k })}>
              <Nav.Item>
                <Nav.Link eventKey="personal" className="small px-3 py-2">
                  <i className="fa fa-user me-1" />
                  Personal(My)
                  {personalTemplateNames.length > 0 && (
                    <Badge bg="primary" className="ms-1" style={{ fontSize: 10 }}>{personalTemplateNames.length}</Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="global" className="small px-3 py-2">
                  <i className="fa fa-globe me-1" />
                  Global
                  {globalTemplateNames.length > 0 && (
                    <Badge bg="secondary" className="ms-1" style={{ fontSize: 10 }}>{globalTemplateNames.length}</Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
            </Nav>

            {/* List header */}
            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-white border-bottom">
              <span className="fw-semibold text-dark small">
                {isPersonal ? 'Personal Templates' : 'Global Templates'}
              </span>
              {(isPersonal || canEditGlobal) && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={isPersonal ? this.addTemplate : this.addGlobalTemplate}
                  title="Add template"
                >
                  <i className="fa fa-plus me-1" />
                  New
                </Button>
              )}
            </div>

            {/* List body */}
            <div className="overflow-auto flex-grow-1 p-2" style={{ minHeight: 0 }}>
              {isPersonal && personalTemplateNames.length === 0 && (
                <p className="text-muted text-center small mt-3">
                  No templates yet.<br />Click <strong>New</strong> to create one.
                </p>
              )}
              {isPersonal && personalTemplateNames.map((name) => (
                <TemplateListItem
                  key={name}
                  name={name}
                  selected={name === selectedPersonalName}
                  onSelect={this.selectPersonalTemplate}
                  onRemove={this.removePersonalTemplate}
                  readOnly={false}
                />
              ))}

              {!isPersonal && globalTemplateNames.length === 0 && (
                <p className="text-muted text-center small mt-3">
                  No global templates available.
                </p>
              )}
              {!isPersonal && globalTemplateNames.map((name) => (
                <TemplateListItem
                  key={name}
                  name={name}
                  selected={name === selectedGlobalName}
                  onSelect={this.selectGlobalTemplate}
                  onRemove={this.removeGlobalTemplate}
                  readOnly={!canEditGlobal}
                />
              ))}
            </div>
          </Col>

          {/* Right panel */}
          <Col md={9} className="h-100">
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 mb-0 rounded-0 small d-flex align-items-center justify-content-between" role="alert">
                <span>
                  <i className="fa fa-exclamation-circle me-1" />
                  {errorMessage}
                </span>
                <button type="button" className="btn-close ms-3" onClick={() => this.setState({ errorMessage: null })} />
              </div>
            )}
            {selectedTemplate ? (
              <TemplateEditPanel
                key={isPersonal ? selectedPersonalName : selectedGlobalName}
                template={selectedTemplate}
                readOnly={!isPersonal && !canEditGlobal}
                onSave={isPersonal ? this.updatePersonalTemplate : this.updateGlobalTemplate}
              />
            ) : (
              <div className="h-100 d-flex align-items-center justify-content-center">
                <div className="text-center text-muted">
                  <i className="fa fa-file-text-o fa-3x mb-3 d-block" />
                  <h5>Select a template to edit</h5>
                  <p className="small">
                    {isPersonal
                      ? <>Or click <strong>New</strong> to create your first template.</>
                      : 'Select a global template to view or edit.'}
                  </p>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    );
  }
}
