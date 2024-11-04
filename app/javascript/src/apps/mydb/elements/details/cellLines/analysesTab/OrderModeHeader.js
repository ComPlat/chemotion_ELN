import React from 'react';
import QuillViewer from 'src/components/QuillViewer';
import PropTypes from 'prop-types';
import { previewContainerImage } from 'src/utilities/imageHelper';
import ImageModal from 'src/components/common/ImageModal';

export default class OrderModeHeader extends React.Component {
  renderDeletedContainer() {
    const { container } = this.props;
    const kind = container.extended_metadata.kind && container.extended_metadata.kind !== '';
    const titleKind = kind ? (` - Type: ${(container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind).trim()}`) : '';

    const status = container.extended_metadata.status && container.extended_metadata.status !== '';
    const titleStatus = status ? (` - Status: ${container.extended_metadata.status}`) : '';

    return (
      <div style={{ width: '100%' }}>
        <strike>
          {container.name}
          {titleKind}
          {titleStatus}
        </strike>
      </div>
    );
  }

  renderNotDeletedContainer() {
    const { container } = this.props;
    const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
    const kind = container.extended_metadata.kind && container.extended_metadata.kind !== '';
    const titleKind = kind ? (` - Type: ${(container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind).trim()}`) : '';
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
              {titleKind}
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

  // eslint-disable-next-line  class-methods-use-this
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
    const { container } = this.props;
    if (container.is_deleted) {
      return this.renderDeletedContainer();
    }
    return this.renderNotDeletedContainer();
  }
}

OrderModeHeader.propTypes = {
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

  }).isRequired
};
