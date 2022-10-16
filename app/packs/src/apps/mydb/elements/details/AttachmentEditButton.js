import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  OverlayTrigger,
  Button,
} from 'react-bootstrap';
import EditorFetcher from 'src/fetchers/EditorFetcher';

import { last, findKey, values } from 'lodash';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';

export default class AttachmentEditButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      attachmentEditor: false,
    };

    this.editorInitial = this.editorInitial.bind(this);
  }

  componentDidMount() {
    this.editorInitial();
  }

  editorInitial() {
    EditorFetcher.initial()
      .then((result) => {
        this.setState({
          attachmentEditor: result.installed,
          extension: result.ext
        });
      });
  }

  documentType(filename) {
    const { extension } = this.state;

    const ext = last(filename.split('.'));
    const docType = findKey(extension, o => o.includes(ext));

    if (typeof (docType) === 'undefined' || !docType) {
      return null;
    }

    return docType;
  }

  handleEdit(attachment) {
    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);
    

    EditorFetcher.startEditing({ attachment_id: attachment.id })
      .then((result) => {
        if (result.token) {
          const url = `/editor?id=${attachment.id}&docType=${docType}&fileType=${fileType}&title=${attachment.filename}&key=${result.token}`;
          window.open(url, '_blank');

          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();

          this.props.onEdit(attachment);
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
  }
 
  render() {
    const { attachmentEditor } = this.state;
    const {attachment, overlay, className } = this.props;
    const updateTime = new Date(attachment.updated_at);
    updateTime.setTime(updateTime.getTime() + (15 * 60 * 1000));
    const isEditing = attachment.aasm_state === 'oo_editing' && new Date().getTime() < updateTime;
    const docType = this.documentType(attachment.filename);
    const editDisable = !attachmentEditor || isEditing || attachment.is_new || docType === null;
    const styleEditorBtn = !attachmentEditor || docType === null ? 'none' : '';
    return (
      <OverlayTrigger placement="left" overlay={overlay} >
        <Button
          style={{ display: styleEditorBtn }}
          bsSize="xsmall"
          className={className}
          bsStyle="success"
          disabled={editDisable}
          onClick={() => this.handleEdit(attachment)}
        >
          <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing} />
        </Button>
      </OverlayTrigger>
    );
  }
}