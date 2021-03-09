import React from 'react';
import PropTypes from 'prop-types';

import { OverlayTrigger, Popover } from 'react-bootstrap';

import _ from 'lodash';
import Delta from 'quill-delta';

import { formatAnalysisContent } from './utils/ElementUtils';

import TextTemplateStore from './stores/TextTemplateStore';
import TextTemplateActions from './actions/TextTemplateActions';

import DynamicToolbarEditor from './react_quill/DynamicToolbarEditor';
import ToolbarIcon from './react_quill/ToolbarIcon';
import BaseToolbar from './react_quill/BaseToolbar';

import TextTemplateToolbar from './text_template_toolbar/TextTemplateToolbar';
import ToolbarTemplateCreator from './text_template_toolbar/ToolbarTemplateCreator';

const toolbarOptions = [
  'bold', 'italic', 'underline',
  'header', 'script',
  'list', 'bullet',
];

export default class AnalysisEditor extends React.Component {
  constructor(props) {
    super(props);

    this.reactQuillRef = React.createRef();

    const templateStore = TextTemplateStore.getState();
    const { predefinedTemplateNames, fetchedPredefinedTemplates } = templateStore;
    const fetchedTemplates = fetchedPredefinedTemplates.toJS();
    this.state = {
      fetchedNames: Object.keys(fetchedTemplates),
      predefinedTemplateNames: predefinedTemplateNames.toJS(),
      fetchedPredefinedTemplates
    };

    this.fetchPredefinedTemplates = this.fetchPredefinedTemplates.bind(this);

    this.onChangeTemplateStore = this.onChangeTemplateStore.bind(this);
    this.onChangeContent = this.onChangeContent.bind(this);
    this.autoFormatContent = this.autoFormatContent.bind(this);
    this.applyTemplate = this.applyTemplate.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

    this.quillOnChange = this.quillOnChange.bind(this);
    this.debouncedQuillOnChange = _.debounce(this.quillOnChange, 300);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.onChangeTemplateStore);

    TextTemplateActions.fetchPredefinedTemplateNames();

    const { template } = this.props;
    const namesToFetch = Object.values(template).flat();
    this.fetchPredefinedTemplates(namesToFetch);
  }

  componentWillReceiveProps(newProps) {
    const { template } = newProps;
    const namesToFetch = Object.values(template).flat();
    this.fetchPredefinedTemplates(namesToFetch);
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.onChangeTemplateStore);
  }

  onChangeTemplateStore(state) {
    const { predefinedTemplateNames, fetchedPredefinedTemplates } = state;
    const { fetchedNames } = this.state;
    const fetchedTemplates = fetchedPredefinedTemplates.toJS();

    const templateStoreFetched = Object.keys(fetchedTemplates);
    const fetched = [...new Set(fetchedNames.concat(templateStoreFetched))];
    this.setState({
      fetchedNames: fetched,
      predefinedTemplateNames: predefinedTemplateNames.toJS(),
      fetchedPredefinedTemplates: fetchedTemplates
    });
  }

  onChangeContent(quillEditor) {
    const { onChangeContent } = this.props;

    if (onChangeContent) {
      onChangeContent(quillEditor.getContents());
    }
  }

  fetchPredefinedTemplates(names) {
    if (!names || names.length === 0) return;

    const { fetchedNames } = this.state;
    const namesToFetch = names.filter(n => !fetchedNames.includes(n));
    if (namesToFetch.length === 0) return;

    const fetched = [...new Set(fetchedNames.concat(names))];
    this.setState({ fetchedNames: fetched }, () => {
      TextTemplateActions.fetchPredefinedTemplateByNames(namesToFetch);
    });
  }

  autoFormatContent() {
    if (this.reactQuillRef.current == null) {
      return;
    }

    const { analysis } = this.props;

    let value = analysis.extended_metadata.content || {};
    value = formatAnalysisContent(analysis);

    const quill = this.reactQuillRef.current.getEditor();
    quill.setContents(value);
    this.onChangeContent(quill);
  }

  quillOnChange(content, delta, source, editor) {
    if (this.reactQuillRef.current == null) {
      return;
    }

    this.onChangeContent(editor);
  }

  applyTemplate(macro) {
    const check = ('ops' in macro) && Array.isArray(macro.ops);
    if (!check) return;

    if (this.reactQuillRef.current == null) {
      return;
    }

    const quill = this.reactQuillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range) return;

    let contents = quill.getContents();
    let elementOps = macro.ops;
    const insertDelta = new Delta(elementOps);
    if (range.index > 0) {
      elementOps = [{ retain: range.index }].concat(elementOps);
    }
    const macroDelta = new Delta(elementOps);
    contents = contents.compose(macroDelta);
    quill.setContents(contents);
    range.length = 0;
    range.index += insertDelta.length();
    quill.setSelection(range);

    this.onChangeContent(quill);
  }

  updateTextTemplates(template) {
    const { updateTextTemplates } = this.props;
    updateTextTemplates(template);
  }

  render() {
    const { predefinedTemplateNames, fetchedPredefinedTemplates } = this.state;

    const { template, analysis, readOnly } = this.props;
    const value = analysis.extended_metadata.content || {};

    const autoFormatIcon = <span className="fa fa-magic" />;
    const templateCreatorPopover = (
      <Popover
        id="popover-positioned-top"
        title="Custom toolbar"
        className="analyses-template-creator"
      >
        <ToolbarTemplateCreator
          template={template}
          templateOptions={predefinedTemplateNames}
          updateTextTemplates={this.updateTextTemplates}
        />
      </Popover>
    );

    return (
      <DynamicToolbarEditor
        theme="snow"
        formats={toolbarOptions}
        style={{ height: '120px' }}
        ref={this.reactQuillRef}
        onChange={this.debouncedQuillOnChange}
        value={value}
        readOnly={readOnly}
      >
        <BaseToolbar />
        <ToolbarIcon
          icon={autoFormatIcon}
          onClick={this.autoFormatContent}
        />
        <TextTemplateToolbar
          template={template}
          predefinedTemplates={fetchedPredefinedTemplates}
          applyTemplate={this.applyTemplate}
        />
        <OverlayTrigger
          trigger="click"
          placement="top"
          rootClose
          overlay={templateCreatorPopover}
          onHide={this.onCloseTemplateCreator}
        >
          <span className="ql-formats">
            <button>
              <span className="fa fa-cog" />
            </button>
          </span>
        </OverlayTrigger>
      </DynamicToolbarEditor>
    );
  }
}

AnalysisEditor.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  template: PropTypes.object,
  analysis: PropTypes.object,
  /* eslint-enable react/forbid-prop-types */
  readOnly: PropTypes.bool,
  onChangeContent: PropTypes.func,
  updateTextTemplates: PropTypes.func,
};

AnalysisEditor.defaultProps = {
  readOnly: false,
  template: {},
  analysis: {},
  onChangeContent: null,
  updateTextTemplates: null
};
