/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import { Map } from 'immutable';
import PropTypes from 'prop-types';
import { Col, Form, Row } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import AiActionButton from 'src/components/common/AiActionButton';

import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

import ContainerDatasets from 'src/components/container/ContainerDatasets';
import QuillViewer from 'src/components/QuillViewer';
import OlsTreeSelect from 'src/components/OlsComponent';
import { confirmOptions } from 'src/components/staticDropdownOptions/options';

import AnalysisEditor from 'src/components/container/AnalysisEditor';
import AnalysisParserModal from 'src/components/container/AnalysisParserModal';
import HyperLinksSection from 'src/components/common/HyperLinksSection';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

let includeDescriptionIdCounter = 0;

export default class ContainerComponent extends Component {
  constructor(props) {
    super(props);

    const { container, templateType } = props;
    const textTemplate = TextTemplateStore.getState()[templateType] || Map();
    this.state = {
      container,
      textTemplate: textTemplate && textTemplate.toJS(),
      includeDescription: !!(container?.description),
      showParserModal: false,
      aiRunning: false
    };
    includeDescriptionIdCounter += 1;
    this.includeDescriptionIdSuffix = includeDescriptionIdCounter;

    this.handleInputChange = this.handleInputChange.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

    this.handleTemplateChange = this.handleTemplateChange.bind(this);

    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
    this.handleIncludeDescriptionChange = this.handleIncludeDescriptionChange.bind(this);
    this.openParserModal = this.openParserModal.bind(this);
    this.closeParserModal = this.closeParserModal.bind(this);
    this.handleAiExtracted = this.handleAiExtracted.bind(this);
    this.handleRunAi = this.handleRunAi.bind(this);
    this.pollAiSpectralData = this.pollAiSpectralData.bind(this);
    this.handleAiResultEdited = this.handleAiResultEdited.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.handleTemplateChange);
  }

  componentDidUpdate(prevProps) {
    const { container } = this.props;
    if (container !== prevProps.container) {
      this.setState({
        container,
        includeDescription: !!(container?.description)
      });
    }
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.handleTemplateChange);
    if (this._aiPollTimer) clearTimeout(this._aiPollTimer);
  }

  handleTemplateChange() {
    const { templateType } = this.props;

    const textTemplate = TextTemplateStore.getState()[templateType];
    this.setState({ textTemplate: textTemplate && textTemplate.toJS() });
  }

  handleInputChange(type, ev) {
    const { container } = this.state;
    let isChanged = false;
    switch (type) {
      case 'name':
        container.name = ev.currentTarget.value;
        isChanged = true;
        break;
      case 'description':
        container.description = ev.currentTarget.value;
        isChanged = true;
        break;
      case 'kind': {
        let kind = (ev || '');
        kind = `${kind.split('|')[0].trim()} | ${(kind.split('|')[1] || '').trim()}`;
        container.extended_metadata.kind = kind;
        isChanged = true;
        break;
      }
      case 'status':
        container.extended_metadata.status = ev;
        isChanged = true;
        break;
      case 'content':
        container.extended_metadata.content = ev;
        isChanged = true;
        break;
      default:
        break;
    }

    const { onChange } = this.props;
    if (isChanged) onChange(container);
  }

  handleAddLink(link) {
    const { container } = this.state;
    let { hyperlinks } = container.extended_metadata;
    if (hyperlinks == null) {
      container.extended_metadata.hyperlinks = [link];
    } else {
      if (typeof hyperlinks === 'string' || hyperlinks instanceof String) {
        hyperlinks = JSON.parse(hyperlinks);
      }

      hyperlinks.push(link);
      container.extended_metadata.hyperlinks = hyperlinks;
    }
    this.setState({ container });
  }

  handleRemoveLink(link) {
    const { container } = this.state;
    let { hyperlinks } = container.extended_metadata;
    if (typeof hyperlinks === 'string' || hyperlinks instanceof String) {
      hyperlinks = JSON.parse(hyperlinks);
    }

    const index = hyperlinks.indexOf(link);
    if (index !== -1) {
      hyperlinks.splice(index, 1);
      container.extended_metadata.hyperlinks = hyperlinks;
    }

    this.setState({ container });
  }

  handleIncludeDescriptionChange(e) {
    const includeDescription = e.target.checked;
    const { onChange } = this.props;
    const { container } = this.state;

    if (!includeDescription) {
      const updatedContainer = { ...container, description: '' };
      this.setState(
        { includeDescription, container: updatedContainer },
        () => onChange(updatedContainer)
      );
    } else {
      this.setState({ includeDescription });
    }
  }

  openParserModal() {
    this.setState({ showParserModal: true });
  }

  closeParserModal() {
    this.setState({ showParserModal: false });
  }

  // Persist a fresh AI structuring result into the container so it is saved
  // with the rest of the analysis on the next Sample save, and so the "info"
  // button can show it again later without re-running the LLM.
  handleAiExtracted(result) {
    const { container } = this.state;
    container.extended_metadata.ai_spectral_data = result;

    const { onChange } = this.props;
    this.setState({ container });
    onChange(container);
  }

  // The user hand-corrected the structured JSON in AnalysisParserModal's edit
  // mode. Merge it into the persisted record (keeping technique/model/etc.)
  // and mark the container dirty so it is written on the next Sample save,
  // exactly like editing the analysis Content or any other field.
  handleAiResultEdited(editedInnerResult) {
    const { container } = this.state;
    const existing = container.extended_metadata.ai_spectral_data || {};
    container.extended_metadata.ai_spectral_data = {
      ...existing,
      result: editedInnerResult,
      edited_at: new Date().toISOString(),
    };

    const { onChange } = this.props;
    this.setState({ container });
    onChange(container);
  }

  // The single "run" action. Whether this executes inline (immediate result)
  // or in the background (delayed_job) is decided entirely server-side by the
  // spectral_extraction task's `execution_mode` in config/llm_tasks/*.yml —
  // there is no client-side mode choice. The response shape tells us which one
  // happened: a `result` payload means it ran inline; `{ queued: true }` means
  // it was queued and we need to poll for completion.
  handleRunAi() {
    const { container } = this.state;
    const content = container.extended_metadata?.content;
    const kind = container.extended_metadata?.kind;

    this.setState({ aiRunning: true });

    fetch('/api/v1/llm/spectral/extract', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ content, kind, container_id: container.id }),
    }).then((response) => {
      if (response.ok) return response.json();
      return response.json().then((data) => { throw new Error(data.error || `HTTP ${response.status}`); });
    }).then((data) => {
      if (data.queued) {
        this.setState({ aiRunning: false });
        NotificationActions.add({
          title: 'Structuring Queued',
          message: 'Structuring this analysis in the background using AI. '
            + 'Results will appear automatically when done.',
          level: 'info',
          position: 'tc',
          autoDismiss: 5,
        });
        const prevExtractedAt = container.extended_metadata?.ai_spectral_data?.extracted_at ?? null;
        this.pollAiSpectralData(container.id, prevExtractedAt, 0);
      } else {
        this.setState({ aiRunning: false });
        this.handleAiExtracted({ ...data, extracted_at: new Date().toISOString() });
        this.setState({ showParserModal: true });
      }
    }).catch(() => {
      // No client-side toast here — the backend already persists a "System
      // Notification" (Message row) for every failure reachable from this
      // endpoint, and NoticeButton's own polling surfaces that as a toast
      // too. Adding a second one here would just duplicate it.
      this.setState({ aiRunning: false });
    });
  }

  // Poll GET /api/v1/containers/:id every 3s until ai_spectral_data.extracted_at
  // changes (success) or ai_spectral_extraction_error.failed_at appears
  // (failure), max 2 minutes. Only reached when execution_mode: async queued a
  // background job. Mirrors ChemicalTab's SDS extraction polling.
  pollAiSpectralData(containerId, prevExtractedAt, attempt) {
    const MAX_ATTEMPTS = 40; // 40 x 3s = 2 min
    const POLL_INTERVAL = 3000;

    if (attempt >= MAX_ATTEMPTS) {
      this.setState({ aiRunning: false });
      NotificationActions.add({
        title: 'Structuring',
        message: 'This is taking longer than expected. Please check back later.',
        level: 'warning',
        position: 'tc',
        autoDismiss: 8,
      });
      return;
    }

    this._aiPollTimer = setTimeout(() => {
      fetch(`/api/v1/containers/${containerId}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }).then((data) => {
        const meta = data?.container?.extended_metadata || {};
        const newExtractedAt = meta.ai_spectral_data?.extracted_at ?? null;
        const failedAt = meta.ai_spectral_extraction_error?.failed_at ?? null;

        if (newExtractedAt && newExtractedAt !== prevExtractedAt) {
          // No toast here — StructureSpectralDataJob's after_perform already
          // persisted a "System Notification" for this completion, and
          // NoticeButton's own polling will surface that. This just syncs the
          // local container state so the info button lights up.
          const { container } = this.state;
          container.extended_metadata.ai_spectral_data = meta.ai_spectral_data;
          this.setState({ container, aiRunning: false });
          this.props.onChange(container);
        } else if (failedAt) {
          // Same reasoning — the job already persisted a failure notification.
          this.setState({ aiRunning: false });
        } else {
          this.pollAiSpectralData(containerId, prevExtractedAt, attempt + 1);
        }
      }).catch(() => {
        this.pollAiSpectralData(containerId, prevExtractedAt, attempt + 1);
      });
    }, POLL_INTERVAL);
  }

  updateTextTemplates(textTemplate) {
    const { templateType } = this.props;
    TextTemplateActions.updateTextTemplates(templateType, textTemplate);
  }

  render() {
    const { container, textTemplate, includeDescription } = this.state;
    const {
      readOnly, disabled, onChange, rootContainer, index, element
    } = this.props;
    const includeDescriptionId = `includeDescription-${index ?? this.includeDescriptionIdSuffix}`;

    let quill = (<span />);
    if (readOnly || disabled) {
      quill = (
        <QuillViewer value={container.extended_metadata.content} />
      );
    } else {
      quill = (
        <AnalysisEditor
          height="12em"
          template={textTemplate}
          analysis={container}
          updateTextTemplates={this.updateTextTemplates}
          onChangeContent={(e) => this.handleInputChange('content', e)}
        />
      );
    }

    const contentText = (() => {
      const c = container.extended_metadata?.content;
      if (!c) return '';
      if (typeof c === 'string') return c.trim();
      if (Array.isArray(c.ops)) {
        return c.ops.map((o) => (typeof o.insert === 'string' ? o.insert : '')).join('').trim();
      }
      return '';
    })();
    const hasContent = contentText.length > 0;
    const aiSpectralData = container.extended_metadata?.ai_spectral_data || null;

    return (
      <div>
        <Row className="align-items-end">
          <Col sm={6} className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              label="Name"
              value={container.name}
              onChange={(e) => this.handleInputChange('name', e)}
              disabled={readOnly || disabled}
            />
          </Col>
          <Col sm={3} className="mb-2">
            <div>
              <Form.Label>Status</Form.Label>
              <Select
                name="status"
                options={confirmOptions}
                value={confirmOptions.find(({ value }) => value === container.extended_metadata.status)}
                isDisabled={readOnly || disabled}
                onChange={({ value }) => this.handleInputChange('status', value)}
              />
            </div>
          </Col>
          <Col sm={3} className="mb-2">
            <Form.Check
              type="checkbox"
              id={includeDescriptionId}
              label={<span className="text-nowrap">Include description</span>}
              checked={includeDescription}
              disabled={readOnly || disabled}
              onChange={this.handleIncludeDescriptionChange}
              className="my-2 d-flex align-items-center gap-2"
            />
          </Col>
        </Row>
        <Col sm={12} className="mb-2">
          <div className="mb-3">
            <Form.Label>{this.props.analysisMethodTitle}</Form.Label>
            <OlsTreeSelect
              selectName={this.props.ontologyName}
              selectedValue={container.extended_metadata.kind || ''}
              onSelectChange={(event) => this.handleInputChange('kind', event)}
              selectedDisable={readOnly || disabled || false}
            />
          </div>
        </Col>
        <Col sm={12} className="mb-2">
          <Form.Group>
            <div className="d-flex align-items-center mb-1 gap-2">
              <Form.Label className="mb-0">Content</Form.Label>
              {hasContent && (
                <AiActionButton
                  label="JSON"
                  loadingLabel="Structuring…"
                  loading={this.state.aiRunning}
                  onRun={this.handleRunAi}
                  runTooltip={(
                    <>
                      Structure this analysis into JSON using AI (LLM-based).
                      Results are generated automatically and may contain inaccuracies — please review carefully.
                    </>
                  )}
                  hasResult={!!aiSpectralData}
                  onViewResult={this.openParserModal}
                  viewResultTooltip="Click to view the last AI-structured result"
                  viewResultDisabledTooltip="Run the AI structuring first to view results"
                />
              )}
            </div>
            {quill}
          </Form.Group>

          <AnalysisParserModal
            show={this.state.showParserModal}
            onHide={this.closeParserModal}
            result={aiSpectralData}
            onResultChange={this.handleAiResultEdited}
          />
          {includeDescription && (
            <Form.Group className="my-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                label="Description"
                value={container.description || ''}
                disabled={readOnly || disabled}
                onChange={(e) => this.handleInputChange('description', e)}
              />
            </Form.Group>
          )}
        </Col>
        <Col sm={12} >
          <Form.Label>Datasets</Form.Label>
          <ContainerDatasets
            container={container}
            element={element}
            readOnly={readOnly}
            disabled={disabled}
            onChange={onChange}
            rootContainer={rootContainer}
            index={index}
          />
        </Col>
        <Col sm={12}>
          <HyperLinksSection
            data={container.extended_metadata.hyperlinks ?? []}
            onAddLink={this.handleAddLink}
            onRemoveLink={this.handleRemoveLink}
            readOnly={readOnly}
            disabled={disabled}
          />
        </Col>
      </div>
    );
  }
}

ContainerComponent.propTypes = {
  ontologyName: PropTypes.string,
  analysisMethodTitle: PropTypes.string,
  element: PropTypes.object,
  templateType: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  container: PropTypes.object,
  rootContainer: PropTypes.object,
  index: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

ContainerComponent.defaultProps = {
  ontologyName: 'chmo',
  analysisMethodTitle: 'Type (Chemical Methods Ontology)',
  templateType: '',
  readOnly: false,
  disabled: false,
  container: {},
  element: {},
  rootContainer: undefined,
  index: undefined
};
