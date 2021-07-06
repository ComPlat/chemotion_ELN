import React from 'react';
import { Checkbox, FormGroup, FormControl, Button, Tooltip, OverlayTrigger, InputGroup, Radio } from 'react-bootstrap';
import uuid from 'uuid';
import { filter } from 'lodash';
import Select from 'react-select';
import GenericElDropTarget from './GenericElDropTarget';
import { genUnit, genUnitSup, FieldLabel, unitConvToBase } from '../../admin/generic/Utils';
import TableRecord from './TableRecord';

const GenTextFormula = (opt) => {
  const { layers } = opt;
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  const subs = [];
  (opt.f_obj && opt.f_obj.text_sub_fields).map((e) => {
    const { layer, field, separator } = e;
    if (field && field !== '') {
      if (field.includes('[@@]')) {
        const fds = field.split('[@@]');
        if (fds && fds.length === 2) {
          const fdt = ((layers[layer] || {}).fields || []).find(f => f.field === fds[0] && f.type === 'table');
          ((fdt && fdt.sub_values) || []).forEach((svv) => {
            if (svv && svv[fds[1]] && svv[fds[1]] !== '') { subs.push(svv[fds[1]]); subs.push(separator); }
          });
        }
      } else {
        const fd = ((layers[layer] || {}).fields || []).find(f => f.field === field);
        if (fd && fd.value && fd.value !== '') { subs.push(fd.value); subs.push(separator); }
      }
    }
    return true;
  });
  return (
    <FormGroup className="text_generic_properties">
      {fieldHeader}
      <FormControl
        type="text"
        value={subs.join('')}
        className="readonly"
        readOnly
        required={false}
      />
    </FormGroup>
  );
};

const GenDummy = () => (
  <FormGroup className="text_generic_properties">
    <FormControl type="text" className="dummy" readOnly />
  </FormGroup>
);

const GenPropertiesTextArea = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  return (
    <FormGroup className="text_generic_properties">
      {fieldHeader}
      <FormControl
        componentClass="textarea"
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        readOnly={opt.readOnly}
        required={opt.isRequired}
        placeholder={opt.placeholder}
      />
    </FormGroup>
  );
};

const GenPropertiesText = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  return (
    <FormGroup className="text_generic_properties">
      {fieldHeader}
      <FormControl
        type="text"
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        readOnly={opt.readOnly}
        required={opt.isRequired}
        placeholder={opt.placeholder}
      />
    </FormGroup>
  );
};

const GenPropertiesCheckbox = opt => (
  <FormGroup>
    <Checkbox
      name={opt.field}
      checked={opt.value}
      onChange={opt.onChange}
      disabled={opt.readOnly}
    >
      <FormControl.Static>{opt.label}</FormControl.Static>
    </Checkbox>
  </FormGroup>
);

const GenPropertiesSelect = (opt) => {
  const options = opt.options.map(op => ({ value: op.key, name: op.key, label: op.label }));
  let className = opt.isEditable ? 'select_generic_properties_editable' : 'select_generic_properties_readonly';
  className = opt.isRequired && opt.isEditable ? 'select_generic_properties_required' : className;
  className = `${className} status-select`;
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  return (
    <FormGroup>
      {fieldHeader}
      <Select
        isClearable
        menuContainerStyle={{ position: 'absolute' }}
        name={opt.field}
        multi={false}
        options={options}
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        disabled={opt.readOnly}
      />
    </FormGroup>
  );
};

const GenPropertiesCalculate = (opt) => {
  const fields = (opt.layer && opt.layer.fields) || [];
  let showVal = 0;
  let showTxt = null;
  let newFormula = opt.formula;

  const calFields = filter(fields, o => (o.type === 'integer' || o.type === 'system-defined'));
  const regF = /[a-zA-Z0-9]+/gm;
  // eslint-disable-next-line max-len
  const varFields = (opt.formula && opt.formula.match(regF)) ? opt.formula.match(regF).sort((a, b) => b.length - a.length) : [];

  varFields.forEach((fi) => {
    if (!isNaN(fi)) return;

    const tmpField = calFields.find(e => e.field === fi);
    if (typeof tmpField === 'undefined' || tmpField == null) {
      newFormula = newFormula.replace(fi, 0);
    } else {
      newFormula = (tmpField.type === 'system-defined') ? newFormula.replace(fi, parseFloat(unitConvToBase(tmpField) || 0)) : newFormula.replace(fi, parseFloat(tmpField.value || 0));
    }
  });

  if (opt.type === 'formula-field') {
    try {
      showVal = eval(newFormula);
      showTxt = !isNaN(showVal) ? parseFloat(showVal.toFixed(5)) : 0;
    } catch (e) {
      if (e instanceof SyntaxError) {
        showTxt = e.message;
      }
    }
  }

  const fieldHeader = opt.label === '' ? null : (<FieldLabel label={opt.label} desc={opt.description} />);
  return (
    <FormGroup>
      {fieldHeader}
      <InputGroup>
        <FormControl
          type="text"
          value={showTxt}
          onChange={opt.onChange}
          className="readonly"
          readOnly="readonly"
          required={false}
          placeholder={opt.placeholder}
          min={0}
        />
        <InputGroup.Button>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="update_calculation_field">adjust</Tooltip>}
          >
            <Button active className="clipboardBtn" onClick={() => opt.onChange(showTxt)}>
              <i className="fa fa-arrow-right" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <FormControl
          type="text"
          value={opt.value}
          onChange={opt.onChange}
          required={false}
          placeholder={opt.placeholder}
          min={0}
        />
      </InputGroup>
    </FormGroup>
  );
};

const GenPropertiesNumber = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  return (
    <FormGroup>
      {fieldHeader}
      <FormControl
        type="number"
        value={opt.value}
        onChange={opt.onChange}
        className={className}
        readOnly={opt.readOnly}
        required={opt.isRequired}
        placeholder={opt.placeholder}
        min={1}
      />
    </FormGroup>
  );
};

const GenPropertiesSystemDefined = (opt) => {
  let className = opt.isEditable ? 'editable' : 'readonly';
  className = opt.isRequired && opt.isEditable ? 'required' : className;
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  return (
    <FormGroup>
      {fieldHeader}
      <InputGroup>
        <FormControl
          type="number"
          value={opt.value}
          onChange={opt.onChange}
          className={className}
          readOnly={opt.readOnly}
          required={opt.isRequired}
          placeholder={opt.placeholder}
          min={1}
        />
        <InputGroup.Button>
          <Button disabled={opt.readOnly} active onClick={opt.onClick} bsStyle="success">
            {genUnitSup(genUnit(opt.option_layers, opt.value_system).label) || ''}
          </Button>
        </InputGroup.Button>
      </InputGroup>
    </FormGroup>
  );
};

const GenPropertiesTable = (opt) => {
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  return (
    <FormGroup>
      {fieldHeader}
      <TableRecord key={`grid_${opt.f_obj.field}`} opt={opt} />
    </FormGroup>
  );
};

const GenPropertiesInputGroup = (opt) => {
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;
  const fLab = e => <div key={uuid.v4()} className="form-control g_input_group_label">{e.value}</div>;
  const fTxt = e => <FormControl className="g_input_group" key={e.id} type={e.type} name={e.id} value={e.value} onChange={o => opt.onSubChange(o, e.id, opt.f_obj)} />;
  const fUnit = e => (
    <span key={`${e.id}_GenPropertiesInputGroup`} className="input-group" style={{ width: '100%' }}>
      <FormControl key={e.id} type="number" name={e.id} value={e.value} onChange={o => opt.onSubChange(o, e.id, opt.f_obj)} min={1} />
      <InputGroup.Button>
        <Button active onClick={() => opt.onSubChange(e, e.id, opt.f_obj)} bsStyle="success">
          {genUnitSup(genUnit(e.option_layers, e.value_system).label) || ''}
        </Button>
      </InputGroup.Button>
    </span>
  );
  const subs = opt.f_obj && opt.f_obj.sub_fields && opt.f_obj.sub_fields.map((e) => {
    if (e.type === 'label') { return fLab(e); } if (e.type === 'system-defined') { return fUnit(e); } return fTxt(e);
  });
  return (
    <FormGroup>
      {fieldHeader}
      <InputGroup style={{ display: 'flex' }}>
        {subs}
      </InputGroup>
    </FormGroup>
  );
};

const GenPropertiesDrop = (opt) => {
  const className = opt.isRequired ? 'drop_generic_properties field_required' : 'drop_generic_properties';

  let createOpt = null;
  if (opt.value.is_new === true) {
    createOpt = (
      <div className="sample_radios">
        <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>associate with this sample</Tooltip>}>
          <Radio name={`dropS_${opt.value.el_id}`} disabled={opt.value.isAssoc === true} checked={opt.value.cr_opt === 0} onChange={() => opt.onChange({ ...opt.value, cr_opt: 0 })} inline>Current</Radio>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>split from the sample first and then associate with it</Tooltip>}>
          <Radio name={`dropS_${opt.value.el_id}`} checked={opt.value.cr_opt === 1} onChange={() => opt.onChange({ ...opt.value, cr_opt: 1 })} inline>Split</Radio>
        </OverlayTrigger>
        <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>duplicate the sample first and then associate with it</Tooltip>}>
          <Radio name={`dropS_${opt.value.el_id}`} checked={opt.value.cr_opt === 2} onChange={() => opt.onChange({ ...opt.value, cr_opt: 2 })} inline>Copy</Radio>
        </OverlayTrigger>
      </div>
    );
  }
  const fieldHeader = opt.label === '' ? null : <FieldLabel label={opt.label} desc={opt.description} />;

  return (
    <FormGroup>
      {fieldHeader}
      <FormControl.Static style={{ paddingBottom: '0px' }}>
        <div className={className}>
          <GenericElDropTarget opt={opt} onDrop={opt.onChange} />
          {createOpt}
          <div>
            <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>remove</Tooltip>}>
              <Button className="btn_del" bsStyle="danger" bsSize="xsmall" onClick={() => opt.onChange({})} ><i className="fa fa-trash-o" aria-hidden="true" /></Button>
            </OverlayTrigger>
          </div>
        </div>
      </FormControl.Static>
    </FormGroup>
  );
};

export {
  GenPropertiesText, GenPropertiesCheckbox, GenPropertiesSelect, GenPropertiesCalculate,
  GenPropertiesNumber, GenPropertiesSystemDefined, GenPropertiesInputGroup, GenPropertiesDrop,
  GenPropertiesTextArea, GenDummy, GenTextFormula, GenPropertiesTable
};
