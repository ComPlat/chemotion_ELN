/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import {
  InputGroup, OverlayTrigger, Tooltip, Form, Button
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { validateCas } from 'src/utilities/CasValidation';

const apiCall = (cas, src = 'cas') => (src === 'cas' ? `https://commonchemistry.cas.org/api/detail?cas_rn=${cas}` : `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${cas}/property/CanonicalSMILES/JSON`);
function FastInput(props) {
  const [value, setValue] = useState(null);
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
    props.fnHandle(value);
  };

  const searchCas = (cas) => {
    let params = {
      apiEndpoint: apiCall(cas),
      requestMethod: 'get',
      jsonTranformation: json => json
    };
    LoadingActions.start();
    BaseFetcher.withoutBodyData(params).then((cjson) => {
      if (cjson.message) {
        params = {
          apiEndpoint: apiCall(cas, 'pubchem'),
          requestMethod: 'get',
          jsonTranformation: json => json
        };
        BaseFetcher.withoutBodyData(params).then((pjson) => {
          if (pjson.Fault) {
            notify({ title: 'CAS Error', lvl: 'error', msg: pjson.Fault.Code });
          } else {
            props.fnHandle(pjson.PropertyTable.Properties[0].CanonicalSMILES, cas);
          }
        }).catch((err) => {
          notify({ title: 'CAS Error', lvl: 'error', msg: err });
        });
      } else {
        props.fnHandle(cjson.smile, cas);
      }
    }).catch((err) => {
      notify({ title: 'CAS Error', lvl: 'error', msg: err });
    }).finally(() => {
      LoadingActions.stop();
    });
  };

  const searchString = (e) => {
    const input = value;
    if (!input) return;
    if (e.key === 'Enter' || e.type === 'click') {
      const getCas = validateCas(input, false);
      if (getCas !== 'smile') {
        searchCas(getCas);
      } else {
        searchSmile();
      }
    } else {
      e.stopPropagation();
    }
  };

  const updateValue = (e) => {
    setValue(e.target.value);
  };

  return (
    <div className="w-50">
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={<Tooltip id="_fast_create_btn">Fast create by CAS RN (with dashes) or SMILES</Tooltip>}
      >
        <InputGroup size="xxsm" className="fast-input">
          <Form.Control
            id="_fast_create_btn_split"
            type="text"
            onChange={updateValue}
            value={value}
            onKeyPress={(e) => searchString(e)}
            placeholder="fast create by CAS/Smiles..."
          />
          <Button
            variant="light"
            onClick={(e) => searchString(e)}
          >
            <i className="fa fa-search" />
          </Button>
        </InputGroup>
      </OverlayTrigger>
    </div>
  );
}

FastInput.propTypes = {
  fnHandle: PropTypes.func.isRequired
};

export default FastInput;
