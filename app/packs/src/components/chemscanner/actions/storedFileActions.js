import uuid from 'uuid';

import * as types from './ActionTypes';
import { scanFileNormalizer } from './fileActions';
import { CALL_API } from '../middleware/api';

export const retrieveStoredFiles = () => dispatch => (
  dispatch({
    type: types.RETRIEVE_STORED_FILES,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/all',
      options: {
        credentials: 'same-origin',
        method: 'post'
      }
    }
  })
);

export const getFileResults = (offset, limit) => dispatch => (
  dispatch({
    type: types.GET_FILE_RESULTS,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/get_file_results',
      options: {
        credentials: 'same-origin',
        method: 'post'
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ offset, limit })
    }
  })
);

export const getScannedOutputs = (ids, type, display) => dispatch => (
  dispatch({
    type: types.GET_SCANNED_OUTPUT,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/get_outputs',
      normalizer: scanFileNormalizer,
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids, type, display })
      },
    }
  })
);

export const hideItems = (ids, type) => dispatch => (
  dispatch({ type: types[`HIDE_${type.toLocaleUpperCase()}`], ids })
);

export const approveItems = (ids, type, val) => dispatch => (
  dispatch({
    type: types[`APPROVE_${type.toLocaleUpperCase()}`],
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/approve',
      normalizer: scanFileNormalizer,
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids, type, val })
      },
    }
  })
);

export const rescanFiles = ids => dispatch => (
  dispatch({
    type: types.RESCAN_STORED_FILE,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/rescan',
      normalizer: scanFileNormalizer,
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      },
    }
  })
);

export const deleteItems = (ids, type, itemVersion) => dispatch => (
  dispatch({
    type: types.DELETE_STORED_FILE,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/delete',
      normalizer: scanFileNormalizer,
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids, type, version: itemVersion || '' })
      },
    }
  })
);

export const downloadFile = id => dispatch => (
  dispatch({
    type: types.DOWNLOAD_STORED_FILE,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/download/',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      },
    }
  })
);

export const uploadToStore = files => (dispatch) => {
  const data = new FormData();
  for (let i = 0; i < files.length; i += 1) data.append(uuid.v4(), files[i]);

  return dispatch({
    type: types.UPLOAD_TO_STORE,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/upload',
      options: {
        credentials: 'same-origin',
        method: 'post',
        body: data
      }
    }
  });
};

export const saveImage = imageList => (
  fetch('/api/v1/chemscanner_storage/save_png', {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'post',
    body: JSON.stringify({ image_list: imageList })
  })
);

export const fetchPreview = id => (
  fetch('/api/v1/chemscanner_storage/scheme_image', {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'post',
    body: JSON.stringify({ id })
  }).then(res => res.json())
);

export const getPreview = id => dispatch => (
  dispatch({
    type: types.GET_SCHEME_PREVIEW,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/scheme_image',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      },
    }
  })
);

export const updateMetadata = (id, type, extendedMetadata) => dispatch => (
  dispatch({
    type: types.UPDATE_METADATA,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/update_metadata',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, type, data: extendedMetadata })
      },
    }
  })
);

export const importData = (data, collection, maintainShortLabel) => dispatch => (
  dispatch({
    type: types.IMPORT_DATA,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/import',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data, collection, maintainShortLabel })
      }
    }
  })
);

export const updateItemField = (id, type, field, value) => dispatch => (
  dispatch({
    type: types.UPDATE_ITEM_FIELD,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/update_output',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id, type, field, value
        })
      }
    }
  })
);

export const toggleAliasPolymer = (moleculeId, atomIdx) => dispatch => (
  dispatch({
    type: types.TOGGLE_ALIAS_POLYMER,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/toggle_polymer',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ moleculeId, atomIdx })
      }
    }
  })
);

export const fetchSvg = (moleculeIds, reactionIds) => dispatch => (
  dispatch({
    type: types.FETCH_SVG,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/fetch_svg',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ moleculeIds, reactionIds })
      }
    }
  })
);

export const beilsteinExport = ids => (
  fetch('/api/v1/chemscanner_storage/beilstein_export', {
    credentials: 'same-origin',
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ids })
  })
);

export const setArchivedValue = (ids, value) => dispatch => (
  dispatch({
    type: types.SET_ARCHIVED_VALUE,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/set_archived',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids, value })
      },
    }
  })
);

export const setExpand = (id, type, value) => dispatch => (
  dispatch({
    type: types[`TOGGLE_${type.toLocaleUpperCase()}_EXPAND`] || types.DEFAULT,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/set_expanded',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, id, value })
      },
    }
  })
);
