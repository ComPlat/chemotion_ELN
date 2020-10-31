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

const extractMacros = (macros) => {
  const tKeys = Object.keys(macros);

  return tKeys.reduce(([iData, ddData], tKey) => {
    const macroNames = macros[tKey];

    /* eslint-disable no-param-reassign */
    if (tKey === '_toolbar') {
      macroNames.forEach((name) => {
        iData[name] = sampleAnalysesMacros[name];
      });
    } else {
      const data = {};
      macroNames.forEach((name) => {
        data[name] = sampleAnalysesMacros[name];
      });
      ddData[tKey] = data;
    }
    /* eslint-enable no-param-reassign */

    return [iData, ddData];
  }, [{}, {}]);
};

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

  render() {
    let { macros } = this.props;
    if (Object.keys(macros).length === 0) {
      macros = {
        _toolbar: defaultMacroToolbar,
        MS: defaultMacroDropdown
      };
    }
    const [iconMacros, ddMacros] = extractMacros(macros);

    const templateCreatorPopover = (
      <Popover
        id="popover-positioned-top"
        title="Custom toolbar"
        className="analyses-template-creator"
      >
        <DynamicTemplateCreator
          iconMacros={iconMacros}
          dropdownMacros={ddMacros}
          predefinedMacros={sampleAnalysesMacros}
        />
      </Popover>
    );

    const { container, readOnly } = this.props;
    const value = container.extended_metadata.content || {};
    const autoFormatIcon = <span className="fa fa-magic" />;

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
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  /* eslint-enable react/forbid-prop-types */
};

ContainerComponentEditor.defaultProps = {
  readOnly: false,
  macros: {},
  container: {},
  onChange: null
};
