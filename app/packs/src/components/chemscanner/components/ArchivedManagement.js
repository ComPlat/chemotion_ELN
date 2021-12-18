import PropTypes from 'prop-types';
import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

const DeleteBtn = ({ deleteItems, data }) => {
  const { id, version } = data;
  const deleteFunc = () => deleteItems([id], 'File', version);
  const deleteTooltip = <Tooltip id="cs-delete-item">Delete</Tooltip>;

  return (
    <OverlayTrigger placement="top" overlay={deleteTooltip}>
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        style={{ float: 'right', marginLeft: '5px' }}
        onClick={deleteFunc}
      >
        <i className="fa fa-trash" />
      </Button>
    </OverlayTrigger>
  );
};

DeleteBtn.propTypes = {
  deleteItems: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired
};

export default class ArchivedManagement extends React.Component {
  constructor(props) {
    super(props);

    this.activedColumnDefs = [
      {
        headerName: 'Actived File',
        field: 'fileName',
        width: 250,
      },
      {
        headerName: 'Created At',
        width: 125,
        suppressSizeToFit: true,
        sortable: true,
        field: 'createdAt'
      },
      {
        headerName: '',
        field: '',
        width: 45,
        suppressSizeToFit: true,
        cellRendererFramework: DeleteBtn,
        cellRendererParams: {
          deleteItems: props.deleteItems
        },
      }
    ];

    this.archivedColumnDefs = [
      {
        headerName: 'Archived File',
        field: 'fileName',
        width: 250,
      },
      {
        headerName: 'Created At',
        width: 125,
        suppressSizeToFit: true,
        sortable: true,
        field: 'createdAt'
      },
      {
        headerName: '',
        field: '',
        width: 45,
        suppressSizeToFit: true,
        cellRendererFramework: DeleteBtn,
        cellRendererParams: {
          deleteItems: props.deleteItems
        },
      }
    ];

    this.onActivedGridReady = this.onActivedGridReady.bind(this);
    this.onArchivedGridReady = this.onArchivedGridReady.bind(this);

    this.setArchived = this.setArchived.bind(this);
    this.setActived = this.setActived.bind(this);
  }

  componentDidUpdate() {
    if (this.activedGridApi && this.activedGridColumnApi) {
      this.activedGridColumnApi.autoSizeColumns();
    }

    if (this.archivedGridApi && this.archivedGridColumnApi) {
      this.archivedGridColumnApi.autoSizeColumns();
    }
  }

  onActivedGridReady(params) {
    this.activedGridApi = params.api;
    this.activedGridColumnApi = params.columnApi;

    params.api.sizeColumnsToFit();
  }

  onArchivedGridReady(params) {
    this.archivedGridApi = params.api;
    this.archivedGridColumnApi = params.columnApi;

    params.api.sizeColumnsToFit();
  }

  setArchived() {
    if (!this.activedGridApi) return;

    const fileIds = this.activedGridApi.getSelectedRows().map(s => s.id);
    this.props.setArchivedValue(fileIds, true);
  }

  setActived() {
    if (!this.archivedGridApi) return;

    const fileIds = this.archivedGridApi.getSelectedRows().map(s => s.id);
    this.props.setArchivedValue(fileIds, false);
  }

  render() {
    const { archivedFiles, activedFiles } = this.props;
    const gridStyle = {
      height: 'calc(100vh - 100px)', flex: 1
    };
    const buttonStyle = {
      width: '33px',
      margin: '5px',
      textAlign: 'center',
      alignSelf: 'center',
      color: 'rgba(0, 0, 0, 0.54)'
    };

    return (
      <div style={{ display: 'flex', margin: '10px' }}>
        <div className="ag-theme-balham" style={gridStyle}>
          <AgGridReact
            id="activedFilesGrid"
            columnDefs={this.activedColumnDefs}
            rowData={activedFiles}
            pagination
            paginationAutoPageSize
            paginateChildRows
            rowSelection="multiple"
            onGridReady={this.onActivedGridReady}
          />
        </div>
        <div style={buttonStyle}>
          <button className="btn btn-xs" onClick={this.setArchived}>
            <i className="fa fa-arrow-circle-right fa-2x" />
          </button>
          &nbsp; &nbsp;
          <button className="btn btn-xs" onClick={this.setActived}>
            <i className="fa fa-arrow-circle-left fa-2x" />
          </button>
        </div>
        <div className="ag-theme-balham" style={gridStyle}>
          <AgGridReact
            id="archivedFilesGrid"
            columnDefs={this.archivedColumnDefs}
            rowData={archivedFiles}
            pagination
            paginationAutoPageSize
            paginateChildRows
            rowSelection="multiple"
            onGridReady={this.onArchivedGridReady}
          />
        </div>
      </div>
    );
  }
}

ArchivedManagement.propTypes = {
  archivedFiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  activedFiles: PropTypes.arrayOf(PropTypes.object).isRequired,
  setArchivedValue: PropTypes.func.isRequired,
  deleteItems: PropTypes.func.isRequired,
};
