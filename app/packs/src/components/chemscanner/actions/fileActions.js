import { fromJS } from 'immutable';
import uuid from 'uuid';

import * as types from './ActionTypes';
import { CALL_API } from '../middleware/api';

import { isPngImage, isSvgImage } from '../utils';

export const scanFileNormalizer = (res, store) => {
  const { schemes } = res;
  if (!schemes) return fromJS(res);

  const cddInstance = store.getState().get('chemdrawInstance');
  if (!cddInstance) return fromJS(res);

  schemes.filter(s => s.imageData).forEach((scheme) => {
    const { imageData } = scheme;
    const isPng = isPngImage(imageData);
    const isSvg = isSvgImage(imageData);

    if (isPng || isSvg) {
      const type = isPng ? 'image/png' : 'image/svg+xml';

      const blob = new Blob([imageData], { type });
      /* eslint-disable-next-line no-param-reassign */
      scheme.imageData = window.URL.createObjectURL(blob);

      /* eslint-disable-next-line no-param-reassign */
      scheme.isSaved = true;

      return;
    }

    const cdxmlRegex = new RegExp('<?xml.*');

    if (cdxmlRegex.test(scheme.imageData)) {
      cddInstance.loadCDXML(imageData);
    } else {
      cddInstance.loadB64CDX(imageData);
    }

    const b64png = cddInstance.g.instanceHub.chemDraw.documentToPreviewPNG();
    const pngb64 = `data:image/png;base64,${b64png}`;
    cddInstance.clear();

    /* eslint-disable-next-line no-param-reassign */
    scheme.pictureData = pngb64;

    const blob = new Blob([pngb64], { type: 'image/png' });
    /* eslint-disable-next-line no-param-reassign */
    scheme.imageData = window.URL.createObjectURL(blob);
  });

  return fromJS(res);
};

export const scanFile = (files, getMol) => (dispatch) => {
  const data = new FormData();
  data.append('get_mol', getMol);
  files.forEach(file => data.append(uuid.v4(), file));
  const actionType = getMol ? types.SCAN_FILE_FOR_MOLECULES : types.SCAN_FILE_FOR_REACTIONS;

  return dispatch({
    type: actionType,
    [CALL_API]: {
      endpoint: '/api/v1/public_chemscanner/upload',
      normalizer: scanFileNormalizer,
      options: {
        credentials: 'same-origin',
        method: 'post',
        body: data
      }
    }
  });
};

export const updateReagents = (reactionId, updateInfo) => dispatch => (
  dispatch({
    type: types.UPDATE_REAGENTS_SMILES,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner/reagent_smiles',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reactionId, updateInfo })
      }
    },
  })
);

export const saveImage = imageList => dispatch => (
  dispatch({
    type: types.SAVE_PNG,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner_storage/save_png',
      options: {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_list: imageList })
      }
    },
  })
);

export const removeFile = fileUid => ({ type: types.HIDE_FILE, fileUid });
