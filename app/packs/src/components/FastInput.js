/* eslint-disable react/forbid-prop-types */
import React, { useRef } from 'react';
import { InputGroup, OverlayTrigger, FormGroup, SplitButton, Tooltip, MenuItem } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import NotificationActions from './actions/NotificationActions';
import BaseFetcher from './fetchers/BaseFetcher';
import LoadingActions from './actions/LoadingActions';

const apiCall = (cas, src = 'cas') => (src === 'cas' ? `https://commonchemistry.cas.org/api/detail?cas_rn=${cas}` : `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${cas}/property/CanonicalSMILES/JSON`);

const FastInput = (props) => {
  const inputCas = useRef('');
  const notify = (_params) => {
    NotificationActions.add({
      title: _params.title,
      message: _params.msg,
      level: _params.lvl,
      position: 'tc',
      dismissible: 'button',
      autoDismiss: 5,
      uid: uuid.v4()
    });
  };

  const searchSmile = () => {
    LoadingActions.start();
    props.fnHandle(inputCas.current.value);
  };

  const search = () => {
    let params = {
      apiEndpoint: apiCall(inputCas.current.value),
      requestMethod: 'get',
      jsonTranformation: json => json
    };
    LoadingActions.start();
    BaseFetcher.withoutBodyData(params).then((cjson) => {
      if (cjson.message) {
        params = {
          apiEndpoint: apiCall(inputCas.current.value, 'pubchem'),
          requestMethod: 'get',
          jsonTranformation: json => json
        };
        BaseFetcher.withoutBodyData(params).then((pjson) => {
          if (pjson.Fault) {
            notify({ title: 'CAS Error', lvl: 'error', msg: pjson.Fault.Code });
          } else {
            props.fnHandle(pjson.PropertyTable.Properties[0].CanonicalSMILES);
          }
        }).catch((err) => {
          notify({ title: 'CAS Error', lvl: 'error', msg: err });
        });
      } else {
        props.fnHandle(cjson.smile);
      }
    }).catch((err) => {
      notify({ title: 'CAS Error', lvl: 'error', msg: err });
    }).finally(() => {
      LoadingActions.stop();
      inputCas.current.value = '';
    });
  };

  const sbTitle = (
    <span>
      <span className="fi-tit">Fast create by</span>
      <input className="fi-txt" type="text" ref={inputCas} />
    </span>
  );

  return (
    <OverlayTrigger
      placement="top"
      delayShow={500}
      overlay={<Tooltip id="_fast_create_btn">Fast create by CAS RN (with dashes) or SMILES</Tooltip>}
    >
      <FormGroup bsSize="xsmall" className="fast-input">
        <InputGroup bsSize="xsmall">
          <SplitButton
            id="_fast_create_btn_split"
            pullRight
            bsStyle="default"
            bsSize="xsmall"
            onToggle={(isOpen, e) => { if (e) { e.stopPropagation(); } }}
            title={sbTitle}
            onClick={(e) => { e.stopPropagation(); }}
            className="fi-btn"
          >
            <MenuItem onSelect={(eventKey, e) => { e.stopPropagation(); search(); }}>
              by CAS
            </MenuItem>
            <MenuItem onSelect={(eventKey, e) => { e.stopPropagation(); searchSmile(); }}>
              by SMILES
            </MenuItem>
          </SplitButton>
        </InputGroup>
      </FormGroup>
    </OverlayTrigger>
  );
};

FastInput.propTypes = { fnHandle: PropTypes.func.isRequired };

export default FastInput;
