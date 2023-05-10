import React from 'react';
import QuillViewer from 'src/components/QuillViewer';
import PropTypes from 'prop-types';
import Container from 'src/models/Container';
import { previewContainerImage } from 'src/utilities/imageHelper';
import ImageModal from 'src/components/common/ImageModal';
import {

  Button

} from 'react-bootstrap';

export default class CellLineAnalysisHeader extends React.Component {
  constructor(props) {
    super(props);
  }

  renderDeletedContainer() {
    const { container } = this.props;
    const kind = container.extended_metadata.kind && container.extended_metadata.kind !== '';
    const titleKind = kind ? (` - Type: ${(container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind).trim()}`) : '';

    const status = container.extended_metadata.status && container.extended_metadata.status != '';
    const titleStatus = status ? (` - Status: ${container.extended_metadata.status}`) : '';

    return (
      <div style={{ width: '100%' }}>
        <strike>
          {container.name}
          {titleKind}
          {titleStatus}
        </strike>
        <Button
          className="pull-right"
          bsSize="xsmall"
          bsStyle="danger"

          onClick={(e) => this.handleUndoDeletionOfContainer(container, e)}
        >
          <i className="fa fa-undo" />
        </Button>
      </div>
    );
  }

  handleUndoDeletionOfContainer(container, e) {
    // To prevent showing the content of the restored analysis i will stop the event here
    e.stopPropagation();
    container.is_deleted = false;
    this.props.parent.handleChange(container);
  }

  renderNotDeletedContainer() {
    const { container } = this.props;
    const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
    const contentOneLine = {
      ops: content.ops.map((x) => {
        const c = { ...x };
        if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
        return c;
      }),
    };

    return (
      <div className="analysis-header">
        <div className="preview">{this.renderImagePreview(container)}</div>
        <div className="abstract">
          <div className="lower-text">
            <div className="main-title">{container.name}</div>
            <div className="sub-title">
              Type:
              {' '}
              {container.extended_metadata.kind || ''}
            </div>
            <div className="sub-title">
              Status:
              {' '}
              {container.extended_metadata.status || ''}
            </div>
            <div className="desc sub-title">
              <span style={{ float: 'left', marginRight: '5px' }}>
                Content:
              </span>
              <QuillViewer value={contentOneLine} preview />
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderImagePreview(container) {
    const previewImg = previewContainerImage(container);
    const fetchNeeded = false;
    const fetchId = 1;

    return (
      <div className="preview">
        <ImageModal
          hasPop={false}
          previewObject={{
            src: previewImg
          }}
          popObject={{
            title: container.name,
            src: previewImg,
            fetchNeeded,
            fetchId
          }}
        />
      </div>
    );
  }

  render() {
    if (this.props.container.is_deleted) {
      return this.renderDeletedContainer();
    }
    return this.renderNotDeletedContainer();
  }
}

CellLineAnalysisHeader.propTypes = {
  content: PropTypes.instanceOf(Container),
  parent: PropTypes.object
};
