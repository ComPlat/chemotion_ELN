import React from 'react';
import QuillViewer from 'src/components/QuillViewer';
import PropTypes from 'prop-types';
import { previewContainerImage } from 'src/utilities/imageHelper';
import ImageModal from 'src/components/common/ImageModal';
import { Button } from 'react-bootstrap';

export default class Header extends React.Component {
  handleUndoDeletionOfContainer(container, e) {
    const { parent } = this.props;
    e.stopPropagation();
    // eslint-disable-next-line   no-param-reassign
    container.is_deleted = false;
    parent.handleChange(container);
  }

  handleDeleteContainer(container, e) {
    const { parent } = this.props;
    e.stopPropagation();

    // eslint-disable-next-line no-restricted-globals, no-alert
    if (confirm('Delete the analysis?')) {
      // eslint-disable-next-line no-param-reassign
      container.is_deleted = true;
      parent.handleChange(container);
    }
  }

  renderDeletedContainer() {
    const { container, isEditHeader } = this.props;
    const kind = container.extended_metadata.kind && container.extended_metadata.kind !== '';
    const titleKind = kind
      ? (` - Type: ${(container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind).trim()}`)
      : '';

    const status = container.extended_metadata.status && container.extended_metadata.status !== '';
    const titleStatus = status ? (` - Status: ${container.extended_metadata.status}`) : '';

    return (
      <div style={{ width: '100%' }}>
        <strike>
          {container.name}
          {titleKind}
          {titleStatus}
        </strike>
        {isEditHeader && (
          <Button
            className="pull-right"
            size="sm"
            variant="danger"
            onClick={(e) => this.handleUndoDeletionOfContainer(container, e)}
          >
            <i className="fa fa-undo" />
          </Button>
        )}
      </div>
    );
  }

  renderNotDeletedContainer() {
    const { container, readOnly, isEditHeader } = this.props;
    const content = container.extended_metadata.content || { ops: [{ insert: '' }] };

    const kind = container.extended_metadata.kind?.split('|')[1] || '';

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
          {isEditHeader && (
            <Button
              disabled={readOnly}
              size="sm"
              variant="danger"
              onClick={(e) => { this.handleDeleteContainer(container, e); }}
            >
              <i className="fa fa-trash" />
            </Button>
          )}
          <div className="lower-text">
            <div className="main-title">{container.name}</div>
            <div className="sub-title">
              Type:
              {' '}
              {kind}
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

  // eslint-disable-next-line class-methods-use-this
  renderImagePreview() {
    const { container, isEditHeader } = this.props;
    const previewImg = previewContainerImage(container);
    const fetchNeeded = false;
    const fetchId = 1;

    return (
      <div className="preview">
        <ImageModal
          hasPop={isEditHeader}
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
    const { container } = this.props;
    if (container.is_deleted) {
      return this.renderDeletedContainer();
    }
    return this.renderNotDeletedContainer();
  }
}

Header.defaultProps = {
  readOnly: false,
  isEditHeader: false,
};

Header.propTypes = {
  container: PropTypes.shape({
    extended_metadata: PropTypes.shape({
      status: PropTypes.string,
      kind: PropTypes.string,
      report: PropTypes.bool,
      // eslint-disable-next-line react/forbid-prop-types
      content: PropTypes.object,
    }),
    name: PropTypes.string,
    is_deleted: PropTypes.bool,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,

  }).isRequired,
  readOnly: PropTypes.bool,
  isEditHeader: PropTypes.bool,

  parent: PropTypes.shape({
    handleChange: PropTypes.func.isRequired
  }).isRequired,
};
