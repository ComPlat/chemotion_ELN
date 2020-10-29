import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, FormControl, FormGroup, ControlLabel
} from 'react-bootstrap';
import Select from 'react-select';
import _ from 'lodash';
import ContainerDatasets from './ContainerDatasets';
import QuillViewer from './QuillViewer';
import ContainerComponentEditor from './ContainerComponentEditor';
import OlsTreeSelect from './OlsComponent';
import { formatAnalysisContent } from './utils/ElementUtils';
import { confirmOptions } from './staticDropdownOptions/options';

import UserStore from './stores/UserStore';
import UserActions from './actions/UserActions';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();

    const { container } = props;
    this.state = {
      container,
      editorTemplate: {}
    };

    this.onChange = this.onChange.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.reformatContent = this.reformatContent.bind(this);
    this.updateEditorTemplate = this.updateEditorTemplate.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container,
    });
  }

  onChange(container) {
    this.props.onChange(container);
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
        container.extended_metadata.status = ev ? ev.value : undefined;
        isChanged = true;
        break;
      case 'content':
        container.extended_metadata.content = ev;
        isChanged = true;
        break;
      default:
        break;
    }

    if (isChanged) this.onChange(container);
  }

  reformatContent() {
    const { container } = this.state;

    container.extended_metadata.content = formatAnalysisContent(container);
    this.onChange(container);
  }

  updateEditorTemplate(data) {
    UserActions.updateUserProfile({ editor_template: data });
    this.setState({ editorTemplate: data });
  }

  render() {
    const { container } = this.state;
    const { readOnly, disabled } = this.props;

    const userProfile = UserStore.getState().profile;
    const userMacros = userProfile.data.macros || {};

    const formatButton = (
      <Button bsSize="xsmall" onClick={this.reformatContent}>
        <i className="fa fa-magic" />
      </Button>
    );

    let quill = (<span />);
    if (readOnly || disabled) {
      quill = (
        <QuillViewer value={container.extended_metadata.content} />
      );
    } else {
      quill = (
        <ContainerComponentEditor
          container={container}
          macros={userMacros}
          updateMacros={this.updateEditorTemplate}
        />
      );
    }

    return (
      <div>
        {quill}
      </div>
    );
  }
}

ContainerComponent.propTypes = {
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  container: PropTypes.object
}
