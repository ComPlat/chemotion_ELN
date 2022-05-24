import PropTypes from 'prop-types';
import React from 'react';
import {
  Button, DropdownButton, MenuItem,
  OverlayTrigger, Tooltip
} from 'react-bootstrap';

const DeleteBtn = ({ deleteItems }) => {
  const deleteTooltip = <Tooltip id="cs-delete-item">Delete</Tooltip>;

  return (
    <OverlayTrigger placement="top" overlay={deleteTooltip}>
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        style={{ float: 'right', marginLeft: '5px' }}
        onClick={deleteItems}
      >
        <i className="fa fa-trash" />
      </Button>
    </OverlayTrigger>
  );
};

DeleteBtn.propTypes = {
  deleteItems: PropTypes.func.isRequired,
};

const DownloadBtn = ({ data, downloadFile }) => {
  const { type } = data;

  let visibility = '';
  if (type !== 'File') visibility = 'hidden';

  const style = {
    float: 'right',
    marginLeft: '5px',
    visibility,
    width: '35px'
  };

  const tooltipId = `cs-download-${type}-${data.id}-tooltip`;
  const downloadTooltip = <Tooltip id={tooltipId}>Download</Tooltip>;

  return (
    <OverlayTrigger placement="top" overlay={downloadTooltip}>
      <Button
        bsSize="xsmall"
        style={style}
        onClick={downloadFile}
      >
        <i className="fa fa-download" />
      </Button>
    </OverlayTrigger>
  );
};

DownloadBtn.propTypes = {
  downloadFile: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired
};

const ShowHideBtn = ({
  data, showReactions, showMolecules, hideItems
}) => {
  const { type, id, schemeCount } = data;
  const children = data.children || [];

  if (type === 'File') {
    const noScheme = !schemeCount;
    const hasNestedFile = children.length === 0 || (
      children.length > 0 && children[0].type !== 'File'
    );

    if (noScheme && hasNestedFile) return <span />;
  }

  let tooltip;
  let button;

  if (data.show) {
    button = (
      <Button
        bsSize="xsmall"
        bsStyle="warning"
        style={{ float: 'right', marginLeft: '5px', width: '35px' }}
        onClick={hideItems}
      >
        <i className="fa fa-eye-slash" />
      </Button>
    );

    tooltip = <Tooltip id="cs-hide-file">Hide</Tooltip>;
  } else {
    const ddId = `cs-show-${type}-${id}-dropdown`;

    const title = <i className="fa fa-eye" />;

    button = (
      <div style={{ float: 'right', marginLeft: '5px', lineHeight: '0px' }}>
        <DropdownButton
          bsSize="xsmall"
          bsStyle="info"
          pullRight
          id={ddId}
          title={title}
        >
          <MenuItem eventKey="1" onClick={showReactions}>Show Reactions</MenuItem>
          <MenuItem eventKey="2" onClick={showMolecules}>Show Molecules</MenuItem>
        </DropdownButton>
      </div>
    );

    tooltip = <Tooltip id="cs-show-file">Show</Tooltip>;
  }

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      {button}
    </OverlayTrigger>
  );
};

ShowHideBtn.propTypes = {
  showReactions: PropTypes.func.isRequired,
  showMolecules: PropTypes.func.isRequired,
  hideItems: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired
};

const RescanBtn = ({ data, rescanFiles }) => {
  const { type, parentId } = data;
  let visibility = '';
  if (type !== 'File' || parentId) visibility = 'hidden';

  const rescanTooltip = <Tooltip id="cs-rescan-file">Rescan File</Tooltip>;

  return (
    <OverlayTrigger placement="top" overlay={rescanTooltip}>
      <Button
        bsSize="xsmall"
        bsStyle="primary"
        style={{ float: 'right', marginLeft: '5px', visibility }}
        onClick={rescanFiles}
      >
        <i className="fa fa-refresh" />
      </Button>
    </OverlayTrigger>
  );
};

RescanBtn.propTypes = {
  rescanFiles: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
};

class FileItemsActionsRenderer extends React.Component {
  constructor(props) {
    super(props);

    this.rescanFiles = this.rescanFiles.bind(this);
    this.showReactions = this.showReactions.bind(this);
    this.showMolecules = this.showMolecules.bind(this);
    this.hideItems = this.hideItems.bind(this);
    this.deleteItems = this.deleteItems.bind(this);
    this.downloadFile = this.downloadFile.bind(this);
  }

  rescanFiles() {
    const { rescanFiles, data } = this.props;

    rescanFiles([data.id]);
  }

  showReactions() {
    const { showItems, data } = this.props;
    const { id, type } = data;

    showItems([id], type, 'reactions');
  }

  showMolecules() {
    const { showItems, data } = this.props;
    const { id, type } = data;

    showItems([id], type, 'molecules');
  }

  hideItems() {
    const { hideItems, data } = this.props;
    const { id, type } = data;

    hideItems([id], type);
  }

  deleteItems() {
    const { deleteItems, data } = this.props;
    const { id, type, version } = data;

    deleteItems([id], type, version);
  }

  downloadFile() {
    const { downloadFile, data } = this.props;
    const { id } = data;

    downloadFile(id).then(res => (
      res.response.blob()
    )).then((blob) => {
      const a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = data.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  render() {
    const { version, data } = this.props;
    const { type } = data;

    if (type.startsWith('Item')) return <span />;

    return (
      <div style={{ marginTop: '1px' }}>
        <DeleteBtn deleteItems={this.deleteItems} data={data} />
        <ShowHideBtn
          showReactions={this.showReactions}
          showMolecules={this.showMolecules}
          hideItems={this.hideItems}
          data={data}
        />
        <DownloadBtn downloadFile={this.downloadFile} data={data} />
        <RescanBtn
          rescanFiles={this.rescanFiles}
          version={version}
          data={data}
        />
      </div>
    );
  }
}

FileItemsActionsRenderer.propTypes = {
  version: PropTypes.string.isRequired,
  rescanFiles: PropTypes.func.isRequired,
  showItems: PropTypes.func.isRequired,
  hideItems: PropTypes.func.isRequired,
  deleteItems: PropTypes.func.isRequired,
  downloadFile: PropTypes.func.isRequired,
  data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default FileItemsActionsRenderer;
