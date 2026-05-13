import base64 from 'base-64';
import { camelCase, snakeCase, upperFirst } from 'lodash';

const getFileName = (response) => {
  const disposition = response.headers.get('Content-Disposition');

  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      return matches[1].replace(/['"]/g, '');
    }
  }
};

const downloadBlob = (file_name, blob) => {
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style = 'display: none';
  a.href = url;
  a.download = file_name;

  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
};

const parseBase64ToArrayBuffer = (encodedData) => {
  const decodedData = base64.decode(encodedData);
  const bufferLength = decodedData.length;
  const bytesArray = new Uint8Array(bufferLength);
  for (let i = 0; i < bufferLength; i++) {
    bytesArray[i] = decodedData.charCodeAt(i);
  }
  return bytesArray.buffer;
};

const transformKeys = (fn, obj) => {
  if (Array.isArray(obj)) return obj.map((item) => transformKeys(fn, item));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((newObj, key) => {
      // eslint-disable-next-line no-param-reassign
      newObj[fn(key)] = transformKeys(fn, obj[key]);
      return newObj;
    }, {});
  }
  return obj;
};

// replaces hump
const camelizeKeys = (obj) => transformKeys(camelCase, obj);
const decamelizeKeys = (obj) => transformKeys(snakeCase, obj);
const camelize = (str) => camelCase(str);
const decamelize = (str) => snakeCase(str);

// returns string: string_test => StringTest
const classifyString = (str) => upperFirst(camelCase(str));

export {
  getFileName, downloadBlob, parseBase64ToArrayBuffer,
  camelizeKeys, decamelizeKeys, camelize, decamelize, classifyString
};
