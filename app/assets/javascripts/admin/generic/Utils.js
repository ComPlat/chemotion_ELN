/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip, Popover } from 'react-bootstrap';
import uuid from 'uuid';
import NotificationActions from '../../components/actions/NotificationActions';
import UserStore from '../../components/stores/UserStore';

const genUnitsSystem = () => {
  const unitsSystem = (UserStore.getState() && UserStore.getState().unitsSystem) || {};
  return (unitsSystem.fields || []);
};

const genUnits = (field) => {
  // const unitsSystem = (UserStore.getState() && UserStore.getState().unitsSystem) || {};
  return (genUnitsSystem().find(u => u.field === field) || {}).units || [];
};

const genUnit = (field, key) => {
  const units = genUnits(field);
  return units.find(u => u.key === key) || {};
};

const notification = props =>
  (
    NotificationActions.add({
      title: props.title,
      message: props.msg,
      level: props.lvl,
      position: 'tc',
      dismissible: 'button',
      uid: props.uid || uuid.v4()
    })
  );

const validateLayerInput = (layer) => {
  if (layer.key === '') {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'Please input Name.' });
    return false;
  }
  if (!(/^[a-z]+[_]*[a-z]*[^_]*$/g.test(layer.key))) {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'This Name is invalid, please try a different one.' });
    return false;
  }
  if (layer.label === '') {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'Please input Display name.' });
    return false;
  }
  if (parseInt((layer.cols || 1), 10) < 1) {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'The minimun of Column per Row is 1, please input a different one.' });
    return false;
  }
  return true;
};

const validateSelectList = (selectName, element) => {
  if (selectName === '') {
    notification({ title: `Select List [${selectName}]`, lvl: 'error', msg: 'Please input Name.' });
    return false;
  }
  if (!(/^[a-z]+[_]*[a-z]*[^_]*$/g.test(selectName))) {
    notification({ title: `Select List [${selectName}]`, lvl: 'error', msg: 'This Name is invalid, please try a different one.' });
    return false;
  }
  if (element.properties_template.select_options[`${selectName}`]) {
    notification({ title: `Select List [${selectName}]`, lvl: 'error', msg: 'This name of Select List is already taken. Please choose another one.' });
    return false;
  }
  return true;
};

const ButtonTooltip = (props) => {
  const tip = <Tooltip id={uuid.v4()}>{props.tip}</Tooltip>;
  const {
    size, bs, fnClick, element, place, fa, disabled, txt
  } = props;
  const content = txt ? (<span>{txt}&nbsp;</span>) : '';
  return (
    <OverlayTrigger placement={place} overlay={tip} >
      <Button bsSize={size} bsStyle={bs} onClick={() => fnClick(element)} disabled={disabled}>
        {content}<i className={`fa ${fa}`} aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );
};

ButtonTooltip.propTypes = {
  tip: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  fnClick: PropTypes.func.isRequired,
  bs: PropTypes.string,
  size: PropTypes.string,
  place: PropTypes.string,
  fa: PropTypes.string,
  disabled: PropTypes.bool,
  txt: PropTypes.string,
};

ButtonTooltip.defaultProps = {
  bs: 'info', size: 'xs', place: 'right', fa: 'fa-pencil-square-o', disabled: false, txt: null
};

const ButtonConfirm = (props) => {
  const {
    msg, size, bs, fnClick, element, place, fa, disabled
  } = props;
  const { delStr, delKey, delRoot } = element;
  const popover = (
    <Popover id="popover-button-confirm">
      {msg} <br />
      <div className="btn-toolbar">
        <Button bsSize="xsmall" bsStyle="danger" aria-hidden="true" onClick={() => fnClick(delStr, delKey, delRoot)}>
        Yes
        </Button><span>&nbsp;&nbsp;</span>
        <Button bsSize="xsmall" bsStyle="warning">No</Button>
      </div>
    </Popover>
  );

  return (
    <OverlayTrigger animation placement={place} root trigger="focus" overlay={popover}>
      <Button bsSize={size} bsStyle={bs} disabled={disabled}>
        <i className={`fa ${fa}`} aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );
};

ButtonConfirm.propTypes = {
  msg: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  fnClick: PropTypes.func.isRequired,
  bs: PropTypes.string,
  size: PropTypes.string,
  place: PropTypes.string,
  fa: PropTypes.string,
  disabled: PropTypes.bool,
};

ButtonConfirm.defaultProps = {
  bs: 'danger', size: 'xs', place: 'right', fa: 'fa-trash-o', disabled: false
};

export {
  ButtonTooltip, ButtonConfirm,
  validateLayerInput, validateSelectList, notification, genUnitsSystem, genUnits, genUnit
};
