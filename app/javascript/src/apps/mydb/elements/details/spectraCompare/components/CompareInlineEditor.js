import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, FormControl, FormLabel, Row,
} from 'react-bootstrap';
import { TreeSelect } from 'antd';

import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { Select } from 'src/components/common/Select';
import { confirmOptions } from 'src/components/staticDropdownOptions/options';
import ContainerDatasets from 'src/components/container/ContainerDatasets';
import QuillViewer from 'src/components/QuillViewer';
import AnalysisEditor from 'src/components/container/AnalysisEditor';
import HyperLinksSection from 'src/components/common/HyperLinksSection';

import {
  buildSelectionTree,
  dropUntypedBranch,
  filterMenuByLayout,
  resolveSelection,
} from '../utils/compareSelectionTree';
import { cleanLayoutLabel } from '../utils/containerLayout';

const EMPTY_CONTENT = { ops: [{ insert: '\n' }] };

const sortedIds = (analyses = []) => analyses
  .map((a) => a?.file?.id)
  .filter(Boolean)
  .sort()
  .join(',');

const useTextTemplate = (templateType) => {
  const [textTemplate, setTextTemplate] = useState(() => {
    const tpl = TextTemplateStore.getState()[templateType];
    return tpl?.toJS?.() || tpl || null;
  });

  useEffect(() => {
    const handler = () => {
      const tpl = TextTemplateStore.getState()[templateType];
      setTextTemplate(tpl?.toJS?.() || tpl || null);
    };
    TextTemplateStore.listen(handler);
    return () => TextTemplateStore.unlisten(handler);
  }, [templateType]);

  return textTemplate;
};

const updateField = (container, mutator) => {
  const next = { ...container };
  mutator(next);
  return next;
};

const setExtendedMetadata = (container, patch) => ({
  ...container,
  extended_metadata: {
    ...(container.extended_metadata || {}),
    ...patch,
  },
});

const buildMenu = (sample, container) => {
  const tree = buildSelectionTree(sample, container);
  const cleaned = dropUntypedBranch(tree);
  const selectedLayout = container?.extended_metadata?.analyses_compared?.[0]?.layout || null;
  return {
    menuItems: filterMenuByLayout(cleaned.menuItems, selectedLayout),
    selectedFiles: cleaned.selectedFiles,
  };
};

const hasGeneratedDatasets = (container) => {
  if (!container?.extended_metadata?.is_comparison) return false;
  const children = container.children || [];
  const childrenHaveData = children.some((child) => (
    !child.is_deleted
    && child.container_type === 'dataset'
    && Array.isArray(child.attachments)
    && child.attachments.some((att) => !att.is_deleted)
  ));
  const compareAttachments = container?.comparable_info?.list_attachments?.length || 0;
  return childrenHaveData || compareAttachments > 0;
};

const wipeChildren = (children = []) => children.map((child) => ({
  ...child,
  is_deleted: true,
  _destroy: true,
}));

const CompareInlineEditor = ({
  container,
  sample,
  templateType,
  readOnly,
  disabled,
  onChange,
  handleSubmit,
  rootContainer,
  index,
}) => {
  const [initialIds, setInitialIds] = useState(() => sortedIds(
    container?.extended_metadata?.analyses_compared,
  ));

  useEffect(() => {
    setInitialIds(sortedIds(container?.extended_metadata?.analyses_compared));
  }, [container?.id]);

  const textTemplate = useTextTemplate(templateType);

  const { menuItems, selectedFiles } = useMemo(
    () => buildMenu(sample, container),
    [sample, container],
  );

  const currentIds = sortedIds(container?.extended_metadata?.analyses_compared);
  const unsavedChanges = currentIds !== initialIds;
  const generated = hasGeneratedDatasets(container);

  const propagate = useCallback((nextContainer) => {
    onChange?.(nextContainer);
  }, [onChange]);

  const handleInputChange = useCallback((type, ev) => {
    if (!container) return;
    let next = container;
    switch (type) {
      case 'name':
        next = updateField(container, (c) => { c.name = ev.currentTarget.value; });
        break;
      case 'description':
        next = updateField(container, (c) => { c.description = ev.currentTarget.value; });
        break;
      case 'status':
        next = setExtendedMetadata(container, { status: ev ? ev.value : undefined });
        break;
      case 'content':
        next = setExtendedMetadata(container, { content: ev });
        break;
      default:
        return;
    }
    propagate(next);
  }, [container, propagate]);

  const handleSelectionChange = useCallback((treeData, value, info) => {
    const selection = resolveSelection({ treeData, selectedFiles: value, info });
    const layoutLabel = cleanLayoutLabel(selection?.[0]?.layout);
    const next = setExtendedMetadata(container, {
      analyses_compared: selection,
      kind: layoutLabel || null,
    });
    propagate(next);
  }, [container, propagate]);

  const handleApply = useCallback(() => {
    handleSubmit?.();
    setInitialIds(currentIds);
  }, [handleSubmit, currentIds, container]);

  const handleReset = useCallback(() => {
    if (!container) return;
    if (!window.confirm('Are you sure you want to reset this comparison? This will remove all generated datasets and clear all fields.')) {
      return;
    }
    const next = {
      ...container,
      children: wipeChildren(container.children),
      description: '',
      preview_img: null,
      comparable_info: container.comparable_info ? {
        ...container.comparable_info,
        layout: null,
        list_analyses: [],
        list_attachments: [],
        list_dataset: [],
      } : container.comparable_info,
      extended_metadata: {
        ...(container.extended_metadata || {}),
        analyses_compared: [],
        status: undefined,
        content: EMPTY_CONTENT,
        hyperlinks: [],
        kind: null,
      },
    };
    propagate(next);
    setInitialIds('');
    handleSubmit?.();
  }, [container, propagate, handleSubmit]);

  const handleAddLink = useCallback((link) => {
    if (!container) return;
    const meta = container.extended_metadata || {};
    let hyperlinks = meta.hyperlinks;
    if (typeof hyperlinks === 'string') {
      try { hyperlinks = JSON.parse(hyperlinks); } catch { hyperlinks = []; }
    }
    if (!Array.isArray(hyperlinks)) hyperlinks = [];
    const next = setExtendedMetadata(container, { hyperlinks: [...hyperlinks, link] });
    propagate(next);
  }, [container, propagate]);

  const handleRemoveLink = useCallback((link) => {
    if (!container) return;
    const meta = container.extended_metadata || {};
    let hyperlinks = meta.hyperlinks;
    if (typeof hyperlinks === 'string') {
      try { hyperlinks = JSON.parse(hyperlinks); } catch { hyperlinks = []; }
    }
    if (!Array.isArray(hyperlinks)) return;
    const next = setExtendedMetadata(container, {
      hyperlinks: hyperlinks.filter((l) => l !== link),
    });
    propagate(next);
  }, [container, propagate]);

  const updateTextTemplates = useCallback((tpl) => {
    TextTemplateActions.updateTextTemplates(templateType, tpl);
  }, [templateType]);

  if (!container) return null;

  const selectedStatus = (confirmOptions || []).find(
    (opt) => opt && opt.value === container?.extended_metadata?.status,
  ) || null;

  const quill = (readOnly || disabled) ? (
    <QuillViewer value={container.extended_metadata?.content} />
  ) : (
    <AnalysisEditor
      height="12em"
      template={textTemplate}
      analysis={container}
      updateTextTemplates={updateTextTemplates}
      onChangeContent={(e) => handleInputChange('content', e)}
    />
  );

  return (
    <div>
      <Row>
        <Col md={8}>
          <label>Name</label>
          <FormControl
            type="text"
            value={container.name || ''}
            onChange={(e) => handleInputChange('name', e)}
            disabled={readOnly || disabled}
          />
        </Col>
        <Col md={4}>
          <div style={{ marginBottom: 11 }}>
            <label>Status</label>
            <Select
              name="status"
              options={confirmOptions}
              value={selectedStatus}
              isDisabled={readOnly || disabled}
              onChange={(opt) => handleInputChange('status', opt)}
            />
          </div>
        </Col>
      </Row>
      <Col md={12} className="mb-2">
        <Form.Group>
          <FormLabel>Content</FormLabel>
          {quill}
        </Form.Group>
        <Form.Group className="my-3">
          <FormLabel>Description</FormLabel>
          <FormControl
            as="textarea"
            rows={3}
            value={container.description || ''}
            disabled={readOnly || disabled}
            onChange={(e) => handleInputChange('description', e)}
          />
        </Form.Group>
      </Col>
      <Col md={12}>
        <div style={{ marginBottom: 11 }}>
          <div className="d-flex align-items-center gap-3 mb-1">
            <FormLabel className="mb-1">Selection of datasets to be compared</FormLabel>
            {generated ? (
              <Button
                variant="danger"
                size="xsm"
                onClick={handleReset}
                title="Reset comparison"
                disabled={disabled}
                className="px-2"
              >
                <i className="fa fa-times me-1" />
                Reset
              </Button>
            ) : (
              <Button
                variant="warning"
                size="xsm"
                onClick={handleApply}
                title="Save changes"
                disabled={!unsavedChanges || disabled}
                className="px-2"
              >
                <i className="fa fa-check me-1" />
                Apply
              </Button>
            )}
          </div>
          <TreeSelect
            style={{ width: '100%' }}
            placeholder="Please select"
            treeCheckable
            value={selectedFiles}
            treeData={menuItems}
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
            onChange={(value, _label, info) => handleSelectionChange(menuItems, value, info)}
            disabled={disabled || generated}
            maxTagCount={2}
          />
        </div>
      </Col>
      <Col md={12}>
        <div className="mt-3">
          <FormLabel>Datasets</FormLabel>
          <ContainerDatasets
            container={container}
            readOnly={readOnly}
            disabled={disabled}
            onChange={onChange}
            rootContainer={rootContainer}
            index={index}
            canAdd={false}
          />
        </div>
      </Col>
      <Col md={12}>
        <HyperLinksSection
          data={container.extended_metadata?.hyperlinks ?? []}
          onAddLink={handleAddLink}
          onRemoveLink={handleRemoveLink}
          readOnly={readOnly}
          disabled={disabled}
        />
      </Col>
    </div>
  );
};

CompareInlineEditor.propTypes = {
  container: PropTypes.object,
  sample: PropTypes.object,
  templateType: PropTypes.string,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  handleSubmit: PropTypes.func,
  rootContainer: PropTypes.object,
  index: PropTypes.number,
};

CompareInlineEditor.defaultProps = {
  container: null,
  sample: null,
  templateType: null,
  readOnly: false,
  disabled: false,
  onChange: () => {},
  handleSubmit: () => {},
  rootContainer: null,
  index: 0,
};

export default CompareInlineEditor;
