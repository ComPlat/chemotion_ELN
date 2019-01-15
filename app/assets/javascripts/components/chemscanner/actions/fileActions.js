/* eslint-disable no-prototype-builtins */

import { Map, List, fromJS } from 'immutable';
import uuid from 'uuid';

import * as types from '../actions/ActionTypes';
import { CALL_API } from '../middleware/api';

const scanFileNormalizer = (res, store, type) => {
  const { embedded } = res;
  if (!embedded || embedded.constructor !== Array) return res;

  let files = List();
  let scannedItems = List();
  const cddInstance = store.getState().get('chemdrawInstance');
  const display = type === types.SCAN_FILE_FOR_MOLECULES ? 'molecules' : 'reactions';

  embedded.forEach((file) => {
    let fileInfo = Map({ name: file.name, uid: file.uid });
    let cds = List();
    let fileItems = List();
    const fileUid = file.uid;

    (file.cds || []).forEach((cd) => {
      let cdItems = List();

      cd.info.forEach((item) => {
        let immuItem = fromJS(item);
        immuItem = immuItem.set('fileUid', fileUid);
        immuItem = immuItem.set('cdUid', cd.cdUid);

        cdItems = cdItems.push(immuItem);
      });

      const cdInfo = { cdUid: cd.cdUid };
      cdInfo[display] = cdItems.map(item => item.get('id'));
      fileItems = fileItems.concat(cdItems);

      if (cd.hasOwnProperty('svg')) cdInfo.svg = cd.svg;
      if (cddInstance) {
        if (cd.hasOwnProperty('b64cdx')) {
          cddInstance.loadB64CDX(cd.b64cdx);
          cdInfo.b64png = cddInstance.getImgUrl();
          cddInstance.clear();
        }
        if (cd.hasOwnProperty('cdxml')) {
          cddInstance.loadCDXML(cd.cdxml);
          // cdInfo.b64png = cddInstance.g.instanceHub.chemDraw.documentToPreviewPNG();
          cdInfo.b64png = cddInstance.getImgUrl();
          cddInstance.clear();
        }
      }

      cds = cds.push(Map(cdInfo));
    });

    fileInfo = fileInfo.set('cds', cds);
    fileInfo = fileInfo.set('display', display);

    files = files.push(fileInfo);
    scannedItems = scannedItems.concat(fileItems);
  });

  return Map({
    files,
    [display]: scannedItems
  });
};

export const scanFile = (files, getMol) => (dispatch) => {
  const data = new FormData();
  data.append('get_mol', getMol);
  files.forEach(file => data.append(uuid.v4(), file));
  const actionType = getMol ? types.SCAN_FILE_FOR_MOLECULES : types.SCAN_FILE_FOR_REACTIONS;

  return dispatch({
    type: actionType,
    [CALL_API]: {
      endpoint: '/api/v1/chemscanner/embedded/upload',
      normalizer: scanFileNormalizer,
      options: {
        credentials: 'same-origin',
        method: 'post',
        body: data
      }
    }
  });
};

export const removeFile = fileUid => ({ type: types.REMOVE_FILE, fileUid });
