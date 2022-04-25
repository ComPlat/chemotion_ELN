import PropTypes from 'prop-types';
import React from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';

class FileItemInformationRenderer extends React.Component {
  constructor(props) {
    super(props);

    this.getPreview = this.getPreview.bind(this);

    this.setPreviewEdit = this.setPreviewEdit.bind(this);
    this.setInfoEdit = this.setInfoEdit.bind(this);
  }

  getPreview() {
    const { getPreview, node } = this.props;
    const { id, type, schemeId } = node.data;
    const itemId = type === 'Scheme' ? id : schemeId;
    if (!itemId) return;

    getPreview(itemId);
  }

  setPreviewEdit() {
    const { setEdit, rowIndex, node } = this.props;
    const {
      id, type, schemeId, imageData
    } = node.data;

    const itemId = type === 'Scheme' ? id : schemeId;
    if (!itemId) return;

    const shouldFetch = !imageData;
    setEdit(rowIndex, itemId, shouldFetch, 'preview');
  }

  setInfoEdit() {
    const { setEdit, rowIndex, node } = this.props;
    const { id } = node.data;
    if (!id) return;

    setEdit(rowIndex, id, false, 'info');
  }

  render() {
    const { node } = this.props;
    const { extendedMetadata, type, schemeCount } = node.data;

    let previewOverlayBtn = <span />;

    if (type === 'Scheme' || (type === 'File' && schemeCount === 1)) {
      previewOverlayBtn = (
        <Button
          bsSize="xsmall"
          onClick={this.setPreviewEdit}
          style={{ marginRight: '5px', width: '25px' }}
        >
          <i className="fa fa-picture-o" />
        </Button>
      );
    }

    let extendedInfo = <span />;
    if (type === 'File' && node.data.children) {
      extendedInfo = (
        <Button
          bsSize="xsmall"
          bsStyle="info"
          style={{ marginRight: '5px', width: '25px' }}
          onClick={this.setInfoEdit}
        >
          <i className="fa fa-info-circle" />
        </Button>
      );
    }

    let warningOverlay = <span />;
    if (extendedMetadata) {
      const { warnings } = extendedMetadata;

      if (warnings && warnings.length > 0) {
        const popoverId = `${node.data.id}-${type}-warning-popover`;
        const warningPopover = (
          <Popover id={popoverId}>
            <ul>
              {/* eslint-disable-next-line react/no-array-index-key */}
              {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
            </ul>
          </Popover>
        );

        warningOverlay = (
          <OverlayTrigger trigger="click" placement="left" overlay={warningPopover}>
            <Button bsSize="xsmall" bsStyle="warning" style={{ width: '25px' }}>
              <i className="fa fa-exclamation-circle" />
            </Button>
          </OverlayTrigger>
        );
      }
    }

    return (
      <div style={{ marginTop: '-2px' }}>
        {previewOverlayBtn}
        {warningOverlay}
        {extendedInfo}
      </div>
    );
  }
}

FileItemInformationRenderer.propTypes = {
  getPreview: PropTypes.func.isRequired,
  setEdit: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
  rowIndex: PropTypes.number.isRequired
};

export default FileItemInformationRenderer;
