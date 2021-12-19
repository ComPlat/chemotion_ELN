import { List } from 'immutable';
import PropTypes from 'prop-types';
import base64 from 'base-64';

import React from 'react';
import { connect } from 'react-redux';

import {
  deleteItems,
  beilsteinExport,
  downloadFile,
  getScannedOutputs,
  getFileResults,
  hideItems,
  approveItems,
  retrieveStoredFiles,
  rescanFiles,
  saveImage,
  uploadToStore,
  fetchPreview,
  updateMetadata,
  setArchivedValue,
  setExpand,
  // updatePreview
} from '../actions/storedFileActions';
import * as types from '../actions/ActionTypes';

import FileStorage from '../components/FileStorage';

import { isPngImage, isSvgImage } from '../utils';

const mapStateToProps = state => ({
  files: state.get('files'),
  schemes: state.get('schemes'),
  reactions: state.get('reactions'),
  molecules: state.get('molecules'),
  ui: state.get('ui'),
  cddInstance: state.get('chemdrawInstance'),
});

const mapDispatchToProps = dispatch => ({
  dispatch,
  retrieveStoredFiles: () => dispatch(retrieveStoredFiles()),
  getFileResults: (offset, limit) => dispatch(getFileResults(offset, limit)),
  uploadToStore: (files) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(uploadToStore(files)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  rescanFiles: (ids) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(rescanFiles(ids)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  setArchivedValue: (ids, val) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(setArchivedValue(ids, val)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  showItems: (ids, type, display) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(getScannedOutputs(ids, type, display)).then((action) => {
      const scannedSchemes = action.response.get('schemes');
      if (!scannedSchemes || scannedSchemes.size === 0) {
        dispatch({ type: types.UNSET_LOADING });
        return;
      }

      const imageList = scannedSchemes.reduce((arr, scheme) => {
        const imageData = scheme.get('pictureData') || '';
        const id = scheme.get('id');
        if (imageData.length === 0 || !id) return arr;

        const isSaved = scheme.get('isSaved') || false;
        if (isSaved) return arr;

        const uuid = scheme.get('uuid');
        arr.push({ id, fileUuid: uuid, imageData });
        return arr;
      }, []);

      if (imageList.length > 0) {
        saveImage(imageList);
      }

      dispatch({ type: types.UNSET_LOADING });
    });
  },
  hideItems: (ids, type) => dispatch(hideItems(ids, type)),
  downloadFile: id => dispatch(downloadFile(id)),
  toggleExpand: (data) => {
    const { id, type } = data;
    const value = !data.expanded;

    const actionType = types[`TOGGLE_${type.toLocaleUpperCase()}_EXPAND`];
    if (actionType) dispatch(setExpand(id, type, value));

    return null;
  },
  openImportModal: data => dispatch({ type: types.SET_IMPORT, data }),
  deleteItems: (ids, type, version) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(deleteItems(ids, type, version)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  beilsteinExport: (ids) => {
    dispatch({ type: types.SET_LOADING });

    return beilsteinExport(ids).then(res => res.json()).then((res) => {
      const listFiles = res.files || [];

      listFiles.forEach((file) => {
        const raw = base64.decode(file.b64 || '');
        const { length } = raw;
        const ab = new ArrayBuffer(length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < length; i += 1) ia[i] = raw.charCodeAt(i);
        const blob = new Blob([ab], { type: 'application/zip' });

        const a = document.createElement('a');
        a.style = 'display: none';
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = file.name;
        a.click();
        window.URL.revokeObjectURL(url);
      });

      dispatch({ type: types.UNSET_LOADING });
    });
  },
  approveItems: (ids, type, val) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(approveItems(ids, type, val)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  updateMetadata: (id, type, extendedMetadata) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(updateMetadata(id, type, extendedMetadata)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  getPreview: (id) => {
    const { dispatch } = dispatchProps;
    dispatch({ type: types.SET_LOADING });

    return fetchPreview(id).then((res) => {
      let imageData = res.image_data;
      if (!imageData) return dispatch({ type: types.UNSET_LOADING });

      const isPng = isPngImage(imageData);
      const isSvg = isSvgImage(imageData);

      let type = isPng ? 'image/png' : 'image/svg+xml';
      if (!isPng && !isSvg) {
        type = 'image/png';
        const { cddInstance } = stateProps;

        if (RegExp('<?xml.*').test(imageData)) {
          cddInstance.loadCDXML(imageData);
        } else {
          cddInstance.loadB64CDX(imageData);
        }

        const b64png = cddInstance.g.instanceHub.chemDraw.documentToPreviewPNG();
        imageData = `data:image/png;base64,${b64png}`;
        cddInstance.clear();

        saveImage([{ id, imageData }]);
      }

      const blob = new Blob([imageData], { type });
      const objUrl = window.URL.createObjectURL(blob);

      dispatch({ type: types.GET_SCHEME_PREVIEW, imageData: objUrl, id });

      return dispatch({ type: types.UNSET_LOADING });
    });
  },
});

class FileStorageContainer extends React.Component {
  constructor(props) {
    super(props);

    this.storageRef = React.createRef();

    this.onGridReady = this.onGridReady.bind(this);
    this.onPaginationChanged = this.onPaginationChanged.bind(this);
  }

  componentDidMount() {
    this.props.retrieveStoredFiles();
  }

  onGridReady(params) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;

    const klass = 'ag-body-viewport-wrapper';
    const viewPortEl = this.storageRef.current.getElementsByClassName(klass)[0];
    if (viewPortEl) {
      this.gridHeight = viewPortEl.offsetHeight;
      this.limit = Math.floor(this.gridHeight / this.rowHeight);
      this.gridApi.paginationSetPageSize(this.limit);
      this.props.getFileResults(0, this.limit);
    }

    this.rowHeight = this.gridApi.gridOptionsWrapper.getRowHeightAsNumber();
  }

  onPaginationChanged(params) {
    const checkChangePage = this.gridApi && params.newPage;
    if (!checkChangePage) return;

    const offset = this.gridApi.paginationGetCurrentPage();
    this.props.getFileResults(offset, this.limit);
  }

  render() {
    const { schemes, ui } = this.props;
    const files = this.props.files.filterNot(f => (
      f.getIn(['extendedMetadata', 'archived']) || false
    ));
    const version = ui.get('version');
    const reload = ui.get('reloadGrid');

    return (
      <div ref={this.storageRef}>
        <FileStorage
          {...this.props}
          files={files}
          schemes={schemes}
          version={version}
          reload={reload}
          onGridReady={this.onGridReady}
          onPaginationChanged={this.onPaginationChanged}
        />
      </div>
    );
  }
}

FileStorageContainer.propTypes = {
  files: PropTypes.instanceOf(List).isRequired,
  schemes: PropTypes.instanceOf(List).isRequired,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(FileStorageContainer);
