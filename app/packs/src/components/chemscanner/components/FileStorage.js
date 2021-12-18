import { List } from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import uuid from 'uuid';

import { AgGridReact19 } from './AgGridReact19';
import FileItemActionsHeader from './FileItemActionsHeader';

import FileItemActionsRenderer from './FileItemActionsRenderer';
import FileItemApproveRenderer from './FileItemApproveRenderer';
import FileItemImportedRenderer from './FileItemImportedRenderer';
import FileItemInformationRenderer from './FileItemInformationRenderer';

// import FileItemApproveFilter from './FileItemApproveFilter';
// import FileItemImportedFilter from './FileItemImportedFilter';
// import FileItemVersionFilter from './FileItemVersionFilter';
// import FileItemFileNameFilter from './FileItemFileNameFilter';

import FileItemInformationEditor from './FileItemInformationEditor';

import {
  buildRowData,
  versionGetter,
  fileNameGetter,
  getNodeChildDetails,
} from './fileStorageUtils';

import NotificationActions from '../../actions/NotificationActions';

const isRowSelectable = node => node.data.type === 'File';

export default class FileStorage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      editing: false,
      editingType: null,
      rowIndex: -1,
    };

    this.uploadInput = React.createRef();

    this.onGridReady = this.onGridReady.bind(this);
    this.rescanFiles = this.rescanFiles.bind(this);
    this.deleteItems = this.deleteItems.bind(this);
    this.beilsteinExport = this.beilsteinExport.bind(this);
    this.showSelectedItems = this.showSelectedItems.bind(this);
    this.openImportModal = this.openImportModal.bind(this);

    this.setInformationEditing = this.setInformationEditing.bind(this);
    this.doneEditing = this.doneEditing.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);

    this.setArchived = this.setArchived.bind(this);
    this.unsetArchived = this.unsetArchived.bind(this);

    this.columnDefs = [
      {
        headerName: 'File',
        field: 'file',
        // filterFramework: FileItemFileNameFilter,
        width: 250,
        valueGetter: fileNameGetter,
        headerCheckboxSelection: true,
        cellRenderer: 'agGroupCellRenderer',
        cellRendererParams: {
          suppressCount: true,
          checkbox: params => ['File', 'Scheme'].includes(params.data.type),
        }
      },
      {
        headerName: 'Created At',
        width: 125,
        suppressSizeToFit: true,
        field: 'createdAt'
      },
      {
        headerName: 'Version',
        width: 110,
        suppressSizeToFit: true,
        // filterFramework: FileItemVersionFilter,
        valueGetter: versionGetter,
      },
      {
        headerName: 'Approved',
        width: 100,
        suppressSizeToFit: true,
        // filterFramework: FileItemApproveFilter,
        cellRendererFramework: FileItemApproveRenderer,
        cellRendererParams: { approveItems: props.approveItems },
        field: 'isApproved'
      },
      {
        headerName: 'Transferred',
        width: 110,
        suppressSizeToFit: true,
        // filterFramework: FileItemImportedFilter,
        cellRendererFramework: FileItemImportedRenderer,
        field: 'isImported'
      },
      {
        headerName: 'Information',
        field: 'information',
        width: 115,
        suppressSizeToFit: true,
        cellRendererFramework: FileItemInformationRenderer,
        editable: true,
        cellEditorFramework: FileItemInformationEditor,
        cellEditorParams: () => ({
          type: this.state.editingType,
          doneEditing: this.doneEditing,
        }),
        cellRendererParams: {
          getPreview: props.getPreview,
          setEdit: this.setInformationEditing,
        },
      },
      {
        headerName: '',
        field: '',
        width: 250,
        filter: false,
        headerClass: 'chemscanner-filestorage-action-header',
        headerComponentFramework: FileItemActionsHeader,
        headerComponentParams: {
          uploadInput: this.uploadInput,
          rescanFiles: this.rescanFiles,
          deleteItems: this.deleteItems,
          beilsteinExport: this.beilsteinExport,
          showSelectedItems: this.showSelectedItems,
          openImportModal: this.openImportModal,
          setArchived: this.setArchived,
          unsetArchived: this.unsetArchived
        },
        cellClass: 'chemscanner-filestorage-action-row',
        cellRendererFramework: FileItemActionsRenderer,
        cellRendererParams: {
          version: props.version,
          showItems: props.showItems,
          rescanFiles: props.rescanFiles,
          hideItems: props.hideItems,
          downloadFile: props.downloadFile,
          deleteItems: props.deleteItems
        },
      }
    ];
  }

  componentDidUpdate() {
    if (!this.gridApi || !this.gridColumnApi) return;

    this.gridApi.sizeColumnsToFit();

    const { rowIndex, editing } = this.state;
    if (!editing) return;

    this.gridApi.startEditingCell({ rowIndex, colKey: 'information' });
  }

  onGridReady(params) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

    params.api.sizeColumnsToFit();

    this.props.onGridReady(params);
  }

  setInformationEditing(rowIndex, itemId, shouldFetch, type) {
    if (!this.gridApi) return;

    const getPreview = () => this.props.getPreview(itemId);

    if (shouldFetch) {
      this.setState({ editing: true, editingType: type, rowIndex }, getPreview);
    } else {
      this.setState({ editing: true, editingType: type, rowIndex });
    }
  }

  setArchived() {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows();
    const fileIds = selected.filter(s => s.type === 'File').map(s => s.id);
    this.props.setArchivedValue(fileIds, true);
  }

  unsetArchived() {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows();
    const fileIds = selected.filter(s => s.type === 'File').map(s => s.id);
    this.props.setArchivedValue(fileIds, false);
  }

  rescanFiles() {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows();
    const fileIds = selected.filter(s => s.type === 'File').map(s => s.id);
    this.props.rescanFiles(fileIds);
  }

  deleteItems() {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows();
    ['File', 'Scheme'].forEach((type) => {
      const selectedItems = selected.filter(i => i.type === type);

      const versionMap = {};
      selectedItems.forEach((item) => {
        const { id } = item;
        const version = item.version || '';
        const arr = versionMap[version];

        if (arr) {
          arr.push(id);
        } else {
          versionMap[version] = [id];
        }
      });

      Object.keys(versionMap).forEach((version) => {
        const ids = versionMap[version];
        if (ids.length === 0) return;

        this.props.deleteItems(ids, type, version);
      });
    });
  }

  beilsteinExport() {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows();
    const selectedItems = selected.filter(i => i.type === 'File' && !i.parentId && i.isApproved);

    if (selectedItems.length > 0) {
      this.props.beilsteinExport(selectedItems.map(s => s.id));
    } else {
      NotificationActions.add({
        title: 'Beilstein export',
        message: 'Please select at least one zip file. The zip files have to be approved first.',
        level: 'warning',
        position: 'tc',
        dismissible: 'button',
        uid: uuid.v4()
      });
    }
  }

  showSelectedItems(showType) {
    if (!this.gridApi) return;

    const selected = this.gridApi.getSelectedRows();
    const ids = [];
    selected.forEach((item) => {
      const { type, schemeId, id } = item;
      if (type === 'File' && schemeId) {
        ids.push(item.schemeId);
      } else if (type === 'Scheme') {
        ids.push(id);
      }
    });

    this.props.showItems(ids, 'Scheme', showType);
  }

  openImportModal() {
    if (!this.gridApi) return;

    const selectedRows = this.gridApi.getSelectedRows();
    const files = selectedRows.filter(r => r.type === 'File');
    const schemes = selectedRows.filter(r => r.type === 'Scheme');

    this.props.openImportModal(files.concat(schemes));
  }

  doneEditing(editingType, data) {
    if (editingType !== 'info') return;

    const { id, type, extendedMetadata } = data;

    this.setState({
      editing: false, editingType: null, rowIndex: -1
    }, () => this.props.updateMetadata(id, type, extendedMetadata));
  }

  toggleExpand(e) {
    this.props.toggleExpand(e.data);
  }

  render() {
    const {
      files, schemes, reactions, molecules, uploadToStore
    } = this.props;

    const rowData = buildRowData(files, schemes, reactions, molecules);

    const uploadFileToStore = (e) => {
      uploadToStore(e.target.files);
      this.uploadInput.current.value = '';
    };

    return (
      <div style={{ margin: '20px 15px 0px 10px' }}>
        <input
          type="file"
          multiple="multiple"
          style={{ display: 'none' }}
          ref={this.uploadInput}
          onChange={uploadFileToStore}
        />
        <div
          className="ag-theme-balham"
          style={{ height: 'calc(100vh - 120px)' }}
        >
          <AgGridReact19
            id="fileStorageGrid"
            columnDefs={this.columnDefs}
            rowData={rowData}
            enableGroupEdit
            onRowGroupOpened={this.toggleExpand}
            pagination
            paginateChildRows={false}
            rowSelection="multiple"
            suppressRowClickSelection
            isRowSelectable={isRowSelectable}
            getNodeChildDetails={getNodeChildDetails}
            onGridReady={this.onGridReady}
            onPaginationChanged={this.props.onPaginationChanged}
          />
        </div>
      </div>
    );
  }
}

FileStorage.propTypes = {
  files: PropTypes.instanceOf(List).isRequired,
  schemes: PropTypes.instanceOf(List).isRequired,
  reactions: PropTypes.instanceOf(List).isRequired,
  molecules: PropTypes.instanceOf(List).isRequired,
  version: PropTypes.string,
  approveItems: PropTypes.func.isRequired,
  deleteItems: PropTypes.func.isRequired,
  beilsteinExport: PropTypes.func.isRequired,
  downloadFile: PropTypes.func.isRequired,
  hideItems: PropTypes.func.isRequired,
  getPreview: PropTypes.func.isRequired,
  rescanFiles: PropTypes.func.isRequired,
  setArchivedValue: PropTypes.func.isRequired,
  showItems: PropTypes.func.isRequired,
  openImportModal: PropTypes.func.isRequired,
  updateMetadata: PropTypes.func.isRequired,
  uploadToStore: PropTypes.func.isRequired,
  toggleExpand: PropTypes.func.isRequired,
  onGridReady: PropTypes.func,
  onPaginationChanged: PropTypes.func,
};

FileStorage.defaultProps = {
  version: '',
  onGridReady() {},
  onPaginationChanged() {},
};
