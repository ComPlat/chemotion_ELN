import React from 'react';
import PropTypes from 'prop-types';

import { OverlayTrigger, Popover } from 'react-bootstrap';

import ReactQuill from './react_quill/ReactQuill';
import Delta from 'quill-delta';

import QuillToolbarDropdown from './react_quill/QuillToolbarDropdown';
import QuillToolbarIcon from './react_quill/QuillToolbarIcon';
import DynamicTemplateCreator from './analyses_toolbar/DynamicTemplateCreator';

import { formatAnalysisContent } from './utils/ElementUtils';

import {
  sampleAnalysesMacros,
  defaultMacroDropdown,
  defaultMacroToolbar
} from './utils/quillToolbarSymbol';

sampleAnalysesMacros.ndash.icon = (
  <span className="fa fa-minus" />
);
sampleAnalysesMacros['h-nmr'].icon = (
  <span>H</span>
);
sampleAnalysesMacros['c-nmr'].icon = (
  <span>C</span>
);

const toolbarOptions = [
  'bold', 'italic', 'underline',
  'header', 'script',
  'list', 'bullet',
];

const extractMacros = macroNames => macroNames.reduce((hash, n) => (
  Object.assign(hash, { [n]: sampleAnalysesMacros[n] })
), {});

export default class ContainerComponentEditor extends React.Component {
  constructor(props) {
    super(props);

    this.toolbarId = `_${Math.random().toString(36).substr(2, 9)}`;
    this.reactQuillRef = React.createRef();

    this.modules = {
      toolbar: { container: `#${this.toolbarId}` },
    };

    this.onChangeContent = this.onChangeContent.bind(this);
    this.autoFormatContent = this.autoFormatContent.bind(this);
    this.quillOnChange = this.quillOnChange.bind(this);
    this.selectDropdown = this.selectDropdown.bind(this);
    this.iconOnClick = this.iconOnClick.bind(this);
    this.applyMacro = this.applyMacro.bind(this);
    this.updateUserMacros = this.updateUserMacros.bind(this);
  }

  onChangeContent(quillEditor) {
    const { onChange } = this.props;

    if (onChange) {
      onChange(quillEditor.getContents());
    }
  }

  autoFormatContent() {
    if (this.reactQuillRef.current == null) {
      return;
    }

    const { container } = this.props;

    let value = container.extended_metadata.content || {};
    value = formatAnalysisContent(container);

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

  applyMacro(macro) {
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
    if (range.index > 0) {
      elementOps = [{ retain: range.index }].concat(elementOps);
    }
    const macroDelta = new Delta(elementOps);
    contents = contents.compose(macroDelta);
    quill.setContents(contents);
    range.length = 0;
    range.index += macroDelta.length();
    quill.setSelection(range);

    this.onChangeContent(quill);
  }

  selectDropdown(_key, value) {
    this.applyMacro(sampleAnalysesMacros[value]);
  }

  iconOnClick(macro) {
    this.applyMacro(macro);
  }

  updateUserMacros(iconMacroNames, dropdownMacroNames) {
    const { updateUserMacros } = this.props;
    const userMacros = { _toolbar: iconMacroNames };
    Object.keys(dropdownMacroNames).forEach((n) => {
      userMacros[n] = dropdownMacroNames[n];
    });

    updateUserMacros(userMacros);
  }

  render() {
    let { macros } = this.props;
    if (Object.keys(macros).length === 0) {
      macros = Object.assign(
        defaultMacroDropdown,
        { _toolbar: defaultMacroToolbar }
      );
    }

    // eslint-disable-next-line no-underscore-dangle
    const iconMacroNames = macros._toolbar;
    const ddMacroNames = [];
    Object.keys(macros).filter(n => n !== '_toolbar').forEach((n) => {
      ddMacroNames[n] = macros[n];
    });

    const iconMacros = extractMacros(iconMacroNames);
    const ddMacros = {};
    Object.keys(ddMacroNames).forEach((n) => {
      ddMacros[n] = extractMacros(ddMacroNames[n]);
    });

    const { container, readOnly } = this.props;
    const value = container.extended_metadata.content || {};
    const autoFormatIcon = <span className="fa fa-magic" />;
    const templateCreatorPopover = (
      <Popover
        id="popover-positioned-top"
        title="Custom toolbar"
        className="analyses-template-creator"
      >
        <DynamicTemplateCreator
          iconMacros={iconMacroNames}
          dropdownMacros={ddMacroNames}
          predefinedMacros={sampleAnalysesMacros}
          updateUserMacros={this.updateUserMacros}
        />
      </Popover>
    );

    return (
      <div>
        <div id={this.toolbarId}>
          <select className="ql-header" defaultValue="">
            <option value="1" />
            <option value="2" />
            <option value="3" />
            <option value="4" />
            <option value="5" />
            <option value="6" />
            <option />
          </select>
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
          <button className="ql-script" value="sub" />
          <button className="ql-script" value="super" />
          <QuillToolbarIcon
            icon={autoFormatIcon}
            onClick={this.autoFormatContent}
          />
          {Object.keys(iconMacros).map((name) => {
            const val = iconMacros[name];
            const onClick = () => this.iconOnClick(val);

            return (
              <QuillToolbarIcon
                key={`${this.toolbarId}_icon_${name}`}
                icon={val.icon ? val.icon : name}
                onClick={onClick}
              />
            );
          })}
          {Object.keys(ddMacros).map((label) => {
            const items = {};
            Object.keys(ddMacros[label]).forEach((k) => {
              items[k.toUpperCase()] = k;
            });

            return (
              <QuillToolbarDropdown
                key={`${this.toolbarId}_dd_${label}`}
                label={label}
                items={items}
                onSelect={this.selectDropdown}
              />
            );
          })}
          <OverlayTrigger
            trigger="click"
            placement="top"
            rootClose
            overlay={templateCreatorPopover}
            onHide={this.onCloseTemplateCreator}
          >
            <span className="ql-formats">
              <button className="ql-editTemplate">
                <span className="fa fa-cog" />
              </button>
            </span>
          </OverlayTrigger>
        </div>
        <ReactQuill
          modules={this.modules}
          theme="snow"
          formats={toolbarOptions}
          style={{ height: '120px' }}
          ref={this.reactQuillRef}
          onChange={this.quillOnChange}
          defaultValue={value}
          readOnly={readOnly}
        />
      </div>
    );
  }
}

ContainerComponentEditor.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  macros: PropTypes.object,
  container: PropTypes.object,
  /* eslint-enable react/forbid-prop-types */
  readOnly: PropTypes.bool,
  onChange: PropTypes.func,
  updateUserMacros: PropTypes.func,
};

ContainerComponentEditor.defaultProps = {
  readOnly: false,
  macros: {},
  container: {},
  onChange: null,
  updateUserMacros: null
};
