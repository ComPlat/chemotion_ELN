/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import {
  InputGroup, OverlayTrigger, Tooltip, Form, Button
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import CasLookupFetcher from 'src/fetchers/CasLookupFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UserStore from 'src/stores/alt/stores/UserStore';
import { validateCas } from 'src/utilities/CasValidation';

function FastInput({ fnHandle }) {
  const [value, setValue] = useState('');

  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const componentEnabled = MatrixCheck(currentUser.matrix, 'fastInput');

  if (!componentEnabled) return null;

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
    fnHandle(value);
  };

  const searchCas = (cas) => {
    LoadingActions.start();
    CasLookupFetcher.fetchByCas(cas)
      .then((result) => {
        fnHandle(result.smiles, result.cas);

        if (result.source === 'pubchem') {
          notify({
            title: 'Info',
            lvl: 'info',
            msg: 'Data retrieved from PubChem',
          });
        }
      })
      .catch((err) => {
        const errorMsg = err.message || err.toString() || 'Failed to look up data';

        notify({
          title: 'CAS Lookup Error',
          lvl: 'error',
          msg: `Unable to retrieve data: ${errorMsg}`,
        });
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const searchString = (e) => {
    const input = value;
    if (e.key === 'Enter' || e.type === 'click') {
      if (!input.trim()) {
        notify({
          title: 'Input Error',
          lvl: 'error',
          msg: 'CAS/SMILES input is required',
        });
        return;
      }
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
    <div className="w-75">
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={<Tooltip id="_fast_create_btn">Fast create by CAS RN (with dashes) or SMILES</Tooltip>}
      >
        <InputGroup size="sm" className="fast-input">
          <Form.Control
            id="_fast_create_btn_split"
            type="text"
            onChange={updateValue}
            value={value}
            onKeyPress={(e) => searchString(e)}
            placeholder="Fast create by CAS/Smiles..."
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
