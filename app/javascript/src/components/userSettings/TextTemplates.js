/* eslint-disable react/prop-types */
import React, { useContext, useEffect, useState, useRef } from 'react';
import Delta from 'quill-delta';
import { Badge, Button, Card, Col, Container, Form, Nav, Row } from 'react-bootstrap';

import QuillEditor from 'src/components/QuillEditor';
import TextTemplateIcon from 'src/apps/admin/textTemplates/TextTemplateIcon';
import TextTemplatesFetcher from 'src/fetchers/TextTemplatesFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

const TemplateListItem = ({ name, selected, onSelect, onRemove, readOnly }) => {
  const selectedClass = selected ? 'bg-primary text-white' : 'bg-light text-dark';
  return (
    <div
      className={`d-flex align-items-center justify-content-between px-3 py-2 rounded mb-1 ${selectedClass}`}
      onClick={() => onSelect(name)}
      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
      role="presentation"
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
};

const TemplateEditPanel = ({ template, readOnly, onSave }) => {
  const [name, setName] = useState(template?.name ?? '');
  const [text, setText] = useState(template?.data?.text ?? '');
  const [icon, setIcon] = useState(template?.data?.icon ?? '');

  // Re-sync local editable state whenever a different template is selected.
  const [prevTemplate, setPrevTemplate] = useState(template);
  if (template !== prevTemplate) {
    setPrevTemplate(template);
    setName(template?.name ?? '');
    setText(template?.data?.text ?? '');
    setIcon(template?.data?.icon ?? '');
  }

  const reactQuillRef = useRef();
  const previewTemplate = {
    ...template,
    name,
    data: { ...template.data, text, icon },
  };

  const handleSave = () => {
    if (!reactQuillRef.current) return;

    const quill = reactQuillRef.current;
    const delta = quill.getContents();
    const deltaLength = delta.length();
    const removeTrailingNewline = new Delta().retain(deltaLength - 1).delete(1);
    const { ops } = delta.compose(removeTrailingNewline);

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
                  onChange={(e) => setName(e.target.value)}
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
                  onChange={(e) => setText(e.target.value)}
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
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g. fa fa-flask"
                  disabled={readOnly}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium text-muted small text-uppercase mb-1">Content</Form.Label>
            <QuillEditor
              ref={reactQuillRef}
              value={template.data}
              onChange={() => {}}
              disabled={readOnly}
            />
          </Form.Group>
        </Form>
      </Card.Body>
      {!readOnly && (
        <Card.Footer className="bg-white border-top py-3 px-4 d-flex justify-content-end">
          <Button variant="primary" onClick={handleSave}>
            <i className="fa fa-save me-2" />
            {template?.id ? 'Update Template' : 'Save Template'}
          </Button>
        </Card.Footer>
      )}
    </Card>
  );
};

const TextTemplates = () => {
  const { userStore } = useContext(StoreContext);
  const [activeTab, setActiveTab] = useState('personal');
  // personal templates
  const [personalTemplateNames, setPersonalTemplateNames] = useState([]);
  const [fetchedPersonalTemplates, setFetchedPersonalTemplates] = useState({});
  const [selectedPersonalName, setSelectedPersonalName] = useState(null);
  // global templates (predefined) - populated from API later
  const [globalTemplateNames, setGlobalTemplateNames] = useState([]);
  const [fetchedGlobalTemplates, setFetchedGlobalTemplates] = useState({});
  const [selectedGlobalName, setSelectedGlobalName] = useState(null);
  // permission - will come from current_user API later
  const [errorMessage, setErrorMessage] = useState(null);
  const canEditGlobal = userStore.currentUser?.global_text_template_editor === true;
  const isPersonal = activeTab === 'personal';
  const selectedTemplate = isPersonal
    ? fetchedPersonalTemplates[selectedPersonalName]
    : fetchedGlobalTemplates[selectedGlobalName];

  const alertClass = 'py-2 px-3 mb-0 rounded-0 small d-flex align-items-center justify-content-between';

  useEffect(() => {
    TextTemplatesFetcher.fetchPersonalTemplates()
      .then((templates) => {
        if (!templates) return;
        const filteredPersonalTemplateNames = templates.map((t) => t.name);
        const newFetchedPersonalTemplates = {};
        templates.forEach((t) => { newFetchedPersonalTemplates[t.name] = t; });

        setPersonalTemplateNames(filteredPersonalTemplateNames);
        setFetchedPersonalTemplates(newFetchedPersonalTemplates);
      });

    TextTemplatesFetcher.fetchPredefinedTemplateNames()
      .then((names) => {
        if (names) setGlobalTemplateNames(names);
      });
  }, []);

  // ── personal ──────────────────────────────────────────────

  const addTemplate = () => {
    if (personalTemplateNames.includes('')) return;

    setPersonalTemplateNames(['', ...personalTemplateNames]);
    setFetchedPersonalTemplates({ ...fetchedPersonalTemplates, '': { name: '', data: {} } });
    setSelectedPersonalName('');
  };

  const selectPersonalTemplate = (name) => {
    setSelectedPersonalName(name);
  };

  const removePersonalTemplate = (name) => {
    const template = fetchedPersonalTemplates[name];

    const doRemove = () => {
      const updated = { ...fetchedPersonalTemplates };
      delete updated[name];
      setPersonalTemplateNames(personalTemplateNames.filter((n) => n !== name));
      setFetchedPersonalTemplates(updated);
      setSelectedPersonalName(selectedPersonalName === name ? null : selectedPersonalName);
    };

    if (template?.id) {
      TextTemplatesFetcher.deletePersonalTemplate(template.id).then((res) => {
        if (res?.error) { setErrorMessage(res.error); return; }
        if (res) { doRemove(); TextTemplateActions.fetchPersonalTemplates(); }
      });
    } else {
      doRemove();
    }
  };

  const updatePersonalTemplate = (template) => {
    const oldName = selectedPersonalName;
    const newName = template.name;

    const applyUpdate = (saved) => {
      const updated = { ...fetchedPersonalTemplates, [newName]: saved };
      if (oldName !== newName) delete updated[oldName];
      const newPersonalTemplateNames = oldName !== newName
        ? personalTemplateNames.map((n) => (n === oldName ? newName : n))
        : personalTemplateNames;

      setPersonalTemplateNames(newPersonalTemplateNames);
      setFetchedPersonalTemplates(updated);
      setSelectedPersonalName(newName);
    };

    if (template.id) {
      TextTemplatesFetcher.updatePersonalTemplate(template).then((res) => {
        if (res?.error) {setErrorMessage(res.error); return; }
        if (res) { setErrorMessage(null); applyUpdate(res); TextTemplateActions.fetchPersonalTemplates(); }
      });
    } else {
      TextTemplatesFetcher.createPersonalTemplate(template).then((res) => {
        if (res?.error) { setErrorMessage(res.error); return; }
        if (res) { setErrorMessage(null); applyUpdate(res); TextTemplateActions.fetchPersonalTemplates(); }
      });
    }
  };

  // ── global ────────────────────────────────────────────────

  const addGlobalTemplate = () => {
    if (globalTemplateNames.includes('')) return;

    setGlobalTemplateNames(['', ...globalTemplateNames]);
    setFetchedGlobalTemplates({ ...fetchedGlobalTemplates, '': { name: '', data: {} } });
    setSelectedGlobalName('');
  };

  const selectGlobalTemplate = (name) => {
    if (name === selectedGlobalName && fetchedGlobalTemplates[name]) return;

    if (fetchedGlobalTemplates[name]) {
      setSelectedGlobalName(name);
    } else {
      TextTemplatesFetcher.fetchPredefinedTemplateByNames([name]).then((res) => {
        if (!res) return;
        const newTemplates = {};
        res.forEach((r) => { newTemplates[r.name] = r; });
        setFetchedGlobalTemplates((prevFetchedGlobalTemplates) => ({ ...prevFetchedGlobalTemplates, ...newTemplates }));
        setSelectedGlobalName(name);
      });
    }
  };

  const removeGlobalTemplate = (name) => {
    TextTemplatesFetcher.deletePredefinedTemplateByName(name).then((res) => {
      if (res?.error) { setErrorMessage(res.error); return; }
      if (!res) return;
      const updated = { ...fetchedGlobalTemplates };
      delete updated[name];

      setGlobalTemplateNames(globalTemplateNames.filter((n) => n !== name));
      setFetchedGlobalTemplates(updated);
      setSelectedGlobalName(selectedGlobalName === name ? null : selectedGlobalName);
    });
  };

  const updateGlobalTemplate = (template) => {
    const oldName = selectedGlobalName;
    const newName = template.name;

    TextTemplatesFetcher.updatePredefinedTemplates(template).then((res) => {
      if (res?.error) { setErrorMessage(res.error); return; }
      if (!res) return;
      setErrorMessage(null);
      const updated = { ...fetchedGlobalTemplates, [newName]: res };
      if (oldName !== newName) delete updated[oldName];

      const newGlobalTemplateNames = oldName !== newName
        ? globalTemplateNames.map((n) => (n === oldName ? newName : n))
        : globalTemplateNames;

      setGlobalTemplateNames(newGlobalTemplateNames);
      setFetchedGlobalTemplates(updated);
      setSelectedGlobalName(newName);
    });
  };

  // ── return ────────────────────────────────────────────────

  return (
    <Container fluid className="d-flex flex-column py-3 px-4" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="d-flex align-items-baseline mb-3">
        <h4 className="fw-bold mb-0">Templates</h4>
        <span className="ms-2 text-muted small">All text templates for reactions and analyses</span>
      </div>

      <Row className="flex-grow-1" style={{ minHeight: 0 }}>
        {/* Left panel */}
        <Col md={3} className="d-flex flex-column h-100 border-end pe-0">
          {/* Tabs */}
          <Nav
            variant="tabs"
            className="px-2 pt-1 bg-white border-bottom"
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
          >
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
                onClick={isPersonal ? addTemplate : addGlobalTemplate}
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
                onSelect={selectPersonalTemplate}
                onRemove={removePersonalTemplate}
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
                onSelect={selectGlobalTemplate}
                onRemove={removeGlobalTemplate}
                readOnly={!canEditGlobal}
              />
            ))}
          </div>
        </Col>

        {/* Right panel */}
        <Col md={9} className="h-100">
          {errorMessage && (
            <div className={`alert alert-danger ${alertClass}`} role="alert">
              <span>
                <i className="fa fa-exclamation-circle me-1" />
                {errorMessage}
              </span>
              <button type="button" className="btn-close ms-3" onClick={() => setErrorMessage(null)} />
            </div>
          )}
          {selectedTemplate ? (
            <TemplateEditPanel
              key={isPersonal ? selectedPersonalName : selectedGlobalName}
              template={selectedTemplate}
              readOnly={!isPersonal && !canEditGlobal}
              onSave={isPersonal ? updatePersonalTemplate : updateGlobalTemplate}
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
};

export default observer(TextTemplates);
