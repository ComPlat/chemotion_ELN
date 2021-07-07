/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip, Popover, ControlLabel } from 'react-bootstrap';
import uuid from 'uuid';
import { findIndex } from 'lodash';
import NotificationActions from '../../components/actions/NotificationActions';
import UserStore from '../../components/stores/UserStore';
import MatrixCheck from '../../components/common/MatrixCheck';

class GenericDummy {
  constructor() {
    this.type = 'dummy';
    this.field = uuid.v1();
    this.position = 100;
    this.label = '';
    this.default = '';
    this.required = false;
  }
}

const inputEventVal = (event, type) => {
  if (type === 'select') {
    return event ? event.value : null;
  } else if (type.startsWith('drag')) {
    return event;
  } else if (type === 'checkbox') {
    return event.target.checked;
  } else if (type === 'formula-field') {
    if (event.target) {
      return event.target.value;
    }
    return event;
  }
  return event.target && event.target.value;
};

const absOlsTermId = val => (val || '').split('|')[0].trim();
const absOlsTermLabel = val => val.replace(absOlsTermId(val), '').replace('|', '').trim();
const toNum = (val) => {
  const parse = Number((val || ''));
  return Number.isNaN(parse) ? 0 : parse;
};

const genUnitSup = (val) => {
  if (typeof val === 'undefined' || val === null) return '';
  const vals = val.match(/<\s*(\w+\b)(?:(?!<\s*\/\s*\1\b)[\s\S])*<\s*\/\s*\1\s*>|[^<]+/g);
  const reV = vals.map((v) => {
    const supVal = v.match(/<sup[^>]*>([^<]+)<\/sup>/);
    if (supVal) return <sup key={uuid.v4()}>{supVal[1]}</sup>;
    const subVal = v.match(/<sub[^>]*>([^<]+)<\/sub>/);
    if (subVal) return <sub key={uuid.v4()}>{subVal[1]}</sub>;
    return v;
  });
  return <span>{reV}</span>;
};

const toBool = (val) => {
  const valLower = String(val).toLowerCase();
  return !(!valLower || valLower === 'false' || valLower === '0');
};

const genUnitsSystem = () => {
  const unitsSystem = (UserStore.getState() && UserStore.getState().unitsSystem) || {};
  return (unitsSystem.fields || []);
};

const genUnits = field => (genUnitsSystem().find(u => u.field === field) || {}).units || [];

const genUnit = (field, key) => {
  const units = genUnits(field);
  return units.find(u => u.key === key) || {};
};

const reUnit = (unitsSystem, optionLayers) => {
  const uniFileds = (unitsSystem.fields || []);
  const uniObj = uniFileds.find(fiel => fiel.field === optionLayers);
  const defaultUnit = ((uniObj && uniObj.field) || '');
  const preUnit = uniFileds.length > 0 ? uniFileds[0].field : '';
  return defaultUnit === '' ? preUnit : defaultUnit;
};

const convertTemp = (key, val) => {
  switch (key) {
    case 'F':
      return ((parseFloat(val) * 1.8) + 32).toFixed(2);
    case 'K':
      return (((parseFloat(val) + 459.67) * 5) / 9).toFixed(2);
    case 'C':
      return (parseFloat(val) - 273.15).toFixed(2);
    default:
      return val;
  }
};

const unitConvToBase = (field = {}) => {
  const units = genUnits(field.option_layers);
  if (units.length <= 1) {
    return field.value;
  }
  const idx = findIndex(units, u => u.key === field.value_system);
  if (idx <= 0) return field.value;
  return ((field.value * units[0].nm) / ((units[idx] && units[idx].nm) || 1) || 0);
};

const unitConversion = (field, key, val) => {
  if (typeof val === 'undefined' || val == null || val === 0 || val === '') {
    return val;
  }
  if (field === 'temperature') {
    return convertTemp(key, val);
  }
  const units = genUnits(field);
  if (units.length <= 1) {
    return val;
  }
  const idx = findIndex(units, u => u.key === key);
  if (idx === -1) {
    return val;
  }
  const pIdx = idx === 0 ? (units.length) : idx;
  const pre = (units[pIdx - 1] && units[pIdx - 1].nm) || 1;
  const curr = (units[idx] && units[idx].nm) || 1;
  return parseFloat((parseFloat(val) * (curr / pre)).toFixed(5));
};

const notification = props =>
  (
    NotificationActions.add({
      title: props.title,
      message: props.msg,
      level: props.lvl,
      position: 'tc',
      dismissible: 'button',
      autoDismiss: props.autoDismiss || 5,
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
  if (bs === '') {
    return (
      <OverlayTrigger placement={place} overlay={tip} >
        <Button bsSize={size} onClick={() => fnClick(element)} disabled={disabled}>
          {content}<i className={`fa ${fa}`} aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }
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
  element: PropTypes.object,
  fnClick: PropTypes.func.isRequired,
  bs: PropTypes.string,
  size: PropTypes.string,
  place: PropTypes.string,
  fa: PropTypes.string,
  disabled: PropTypes.bool,
  txt: PropTypes.string,
};

ButtonTooltip.defaultProps = {
  bs: '', size: 'xs', place: 'right', fa: 'fa-pencil-square-o', disabled: false, txt: null, element: {}
};

const ButtonConfirm = (props) => {
  const {
    msg, size, bs, fnClick, fnParams, place, fa, disabled
  } = props;
  const popover = (
    <Popover id="popover-button-confirm">
      {msg} <br />
      <div className="btn-toolbar">
        <Button bsSize="xsmall" bsStyle="danger" aria-hidden="true" onClick={() => fnClick(fnParams)}>
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
  fnParams: PropTypes.object.isRequired,
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

const FieldLabel = (props) => {
  const { label, desc } = props;
  return (desc && desc !== '') ? (
    <OverlayTrigger placement="top" delayShow={1000} overlay={<Tooltip id={uuid.v4()}>{desc}</Tooltip>}>
      <ControlLabel>{label}</ControlLabel>
    </OverlayTrigger>
  ) : <ControlLabel>{label}</ControlLabel>;
};

FieldLabel.propTypes = { label: PropTypes.string.isRequired, desc: PropTypes.string };
FieldLabel.defaultProps = { desc: '' };

const GenericDSMisType = () => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (MatrixCheck(currentUser.matrix, 'genericDataset')) {
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip">Type (Chemical Methods Ontology) has been changed. <br />Please review this Dataset content.</Tooltip>}>
        <span style={{ color: 'red' }}><i className="fa fa-exclamation-triangle" />&nbsp;</span>
      </OverlayTrigger>
    );
  }
  return null;
};

const clsInputGroup = (el) => {
  if (!el) return el;
  const genericEl = el;
  const { layers } = genericEl.properties_template;
  const keys = Object.keys(layers);
  keys.forEach((key) => {
    const layer = layers[key];
    layer.fields.filter(e => e.type === 'input-group')
      .forEach((e) => {
        e.sub_fields.forEach((s) => {
          const ff = s;
          if (ff.type === 'text') { ff.value = ''; }
        });
      });
  });
  return genericEl;
};

const molOptions = [{ label: 'InChiKey', value: 'inchikey' }, { label: 'SMILES', value: 'smiles' }, { label: 'IUPAC', value: 'iupac' }, { label: 'Mass', value: 'molecular_weight' }];
const samOptions = [{ label: 'Name', value: 'name' }, { label: 'Ext. Label', value: 'external_label' }, { label: 'Mass', value: 'molecular_weight' }];

export {
  ButtonTooltip, ButtonConfirm, GenericDSMisType, FieldLabel, GenericDummy,
  validateLayerInput, validateSelectList, notification, genUnitsSystem, genUnits, genUnit,
  unitConvToBase, unitConversion, toBool, toNum, genUnitSup, absOlsTermId, absOlsTermLabel, reUnit,
  clsInputGroup, inputEventVal, molOptions, samOptions
};
