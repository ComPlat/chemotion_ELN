import React from 'react';
import PropTypes from 'prop-types';

import { OverlayTrigger, Popover } from 'react-bootstrap';

import Delta from 'quill-delta';

import { formatAnalysisContent } from 'src/utilities/ElementUtils';

import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

import DynamicToolbarEditor from 'src/components/reactQuill/DynamicToolbarEditor';
import ToolbarIcon from 'src/components/reactQuill/ToolbarIcon';
import BaseToolbar from 'src/components/reactQuill/BaseToolbar';

import TextTemplateToolbar from 'src/components/textTemplateToolbar/TextTemplateToolbar';
import ToolbarTemplateCreator from 'src/components/textTemplateToolbar/ToolbarTemplateCreator';

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
    const fetchedTemplates = fetchedPredefinedTemplates && fetchedPredefinedTemplates.toJS();
    this.state = {
      fetchedNames: Object.keys(fetchedTemplates),
      predefinedTemplateNames: predefinedTemplateNames && predefinedTemplateNames.toJS(),
      fetchedPredefinedTemplates,
      updateTemplate: false
    };

    this.fetchPredefinedTemplates = this.fetchPredefinedTemplates.bind(this);

    this.onChangeTemplateStore = this.onChangeTemplateStore.bind(this);
    this.onChangeContent = this.onChangeContent.bind(this);
    this.autoFormatContent = this.autoFormatContent.bind(this);
    this.applyTemplate = this.applyTemplate.bind(this);
    this.updateTextTemplates = this.updateTextTemplates.bind(this);

    this.quillOnChange = this.quillOnChange.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.onChangeTemplateStore);
    TextTemplateActions.fetchPredefinedTemplateNames();

    const { template } = this.props;
    const namesToFetch = Object.values(template).flat();
    this.fetchPredefinedTemplates(namesToFetch);
  }

  componentDidUpdate(prevProps) {
    const { template } = this.props;
    const namesToFetch = Object.values(template).flat();

    if (!this.state.updateTemplate && Object.keys(template).length !== 0) {
      // this.fetchPredefinedTemplates(namesToFetch);
      TextTemplateActions.fetchPredefinedTemplateByNames(namesToFetch);

      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        updateTemplate: true
      });
    } else if (this.props.template !== prevProps.template && this.state.updateTemplate) {
      const prevnamesToFetch = Object.values(prevProps.template).flat();

      if (prevnamesToFetch.length !== namesToFetch.length) {
        // this.fetchPredefinedTemplates(namesToFetch);
        TextTemplateActions.fetchPredefinedTemplateByNames(namesToFetch);
      }
    }
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.onChangeTemplateStore);
  }

  onChangeTemplateStore(state) {
    const { predefinedTemplateNames, fetchedPredefinedTemplates } = state;
    const { fetchedNames } = this.state;
    const fetchedTemplates = (fetchedPredefinedTemplates && fetchedPredefinedTemplates.toJS()) || Map();

    const templateStoreFetched = Object.keys(fetchedTemplates);
    const fetched = [...new Set(fetchedNames.concat(templateStoreFetched))];
    this.setState({
      fetchedNames: fetched,
      predefinedTemplateNames: predefinedTemplateNames && predefinedTemplateNames.toJS(),
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
        ref={this.reactQuillRef}
        onChange={this.quillOnChange}
        value={value}
        readOnly={readOnly}
      >
        <BaseToolbar />
        <ToolbarIcon
          icon={autoFormatIcon}
          onClick={this.autoFormatContent}
          title="Auto Format"
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
          <button className="ql-formats" title="Template Settings">
            <i as="button" className="fa fa-cog" />
          </button>
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
