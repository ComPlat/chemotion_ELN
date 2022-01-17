/* eslint-disable no-empty */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React from 'react';
import Numeral from 'numeral';
import GenericSubField from '../models/GenericSubField';
import { AddRowBtn, DelRowBtn, DnDRowBtn, NullRowBtn } from './GridBtn';
import { ColumnHeader, ColumnRow, NoRow } from './GridEntry';
import UConverterRenderer from './UConverterRenderer';
import { genUnits, unitConversion, molOptions, samOptions } from '../../admin/generic/Utils';
import DropRenderer from './DropRenderer';
import DropTextRenderer from './DropTextRenderer';
import DropLinkRenderer from './DropLinkRenderer';
import SampOption from './SamOption';
import DragDropItemTypes from '../DragDropItemTypes';

export default class TableRecord extends React.Component {
  constructor(props) {
    super(props);
    this.delRow = this.delRow.bind(this);
    this.addRow = this.addRow.bind(this);
    this.moveRow = this.moveRow.bind(this);
    this.onCellChange = this.onCellChange.bind(this);
    this.onUnitClick = this.onUnitClick.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onChk = this.onChk.bind(this);
    this.getColumns = this.getColumns.bind(this);
  }

  onCellChange(params) {
    const { e, columnDef, rowValue } = params;
    const newValue = e.target.value;
    const oldValue = rowValue[columnDef.field].value;
    if (oldValue === newValue) return;
    if (columnDef.type === 'text') {
      rowValue[columnDef.field] = newValue;
    }
    if (columnDef.type === 'system-defined') {
      if (isNaN(newValue)) return;
      rowValue[columnDef.field].value = Numeral(newValue).value();
    }
    const { opt } = this.props;
    const subVals = opt.f_obj.sub_values || [];
    const idx = subVals.findIndex(s => s.id === rowValue.id);
    subVals.splice(idx, 1, rowValue);
    opt.f_obj.sub_values = subVals;
    opt.onSubChange(0, 0, opt.f_obj, true);
  }

  onUnitClick(subField, node) {
    const { data } = node;
    const { opt } = this.props;
    const subVals = opt.f_obj.sub_values || [];
    const subVal = subVals.find(s => s.id === data.id);
    const units = genUnits(subField.option_layers);
    let uIdx = units.findIndex(u => u.key === subVal[subField.id].value_system);
    if (uIdx < units.length - 1) uIdx += 1; else uIdx = 0;
    const vs = units.length > 0 ? units[uIdx].key : '';
    const v = unitConversion(subField.option_layers, vs, subVal[subField.id].value);
    subVal[subField.id] = { value: v, value_system: vs };
    const idx = subVals.findIndex(s => s.id === data.id);
    subVals.splice(idx, 1, subVal);
    opt.f_obj.sub_values = subVals;
    opt.onSubChange(subField, subField.id, opt.f_obj, true);
  }

  onDrop(targetProps, targetOpt) {
    const { opt } = this.props;
    const subField = targetOpt.sField;
    const subVals = opt.f_obj.sub_values || [];
    const subVal = subVals.find(s => s.id === targetOpt.data.id);
    subVal[subField.id] = { value: targetProps };
    const idx = subVals.findIndex(s => s.id === targetOpt.data.id);
    subVals.splice(idx, 1, subVal);
    opt.f_obj.sub_values = subVals;
    opt.onSubChange(subField, subField.id, opt.f_obj, true);
  }

  onChk(params) {
    const { node, subField, crOpt } = params;
    const { opt } = this.props;
    const subVals = opt.f_obj.sub_values || [];
    const subVal = subVals.find(s => s.id === node.data.id);
    node.data[subField.id].value.cr_opt = crOpt;
    subVal[subField.id] = { value: node.data[subField.id].value };
    const idx = subVals.findIndex(s => s.id === node.data.id);
    subVals.splice(idx, 1, subVal);
    opt.f_obj.sub_values = subVals;
    opt.onSubChange(subField, subField.id, opt.f_obj, true);
  }

  getColumns() {
    const { opt } = this.props;
    const sValues = (opt.f_obj.sub_values || []);
    let columnDefs = [];
    (opt.f_obj.sub_fields || []).forEach((sF) => {
      let colDef = {
        type: sF.type, headerName: sF.col_name, field: sF.id
      };
      const colDefExt = [];
      if (sF.type === 'text') {
        colDef = Object.assign({}, colDef, {
          editable: true, onCellChange: this.onCellChange
        });
      }
      if (sF.type === 'system-defined') {
        const cellParams = { sField: sF, onChange: this.onUnitClick };
        colDef = Object.assign({}, colDef, {
          cellRenderer: UConverterRenderer, cellParams, onCellChange: this.onCellChange
        });
      }
      if (sF.type === 'drag_molecule') {
        const cellParams = { sField: sF, opt, onChange: this.onDrop };
        colDef = Object.assign({}, colDef, {
          cellRenderer: DropRenderer, cellParams, onCellChange: this.onCellChange, width: '5vw'
        });
        const conf = ((sF.value || '').split(';') || []);
        conf.forEach((c) => {
          const attr = molOptions.find(m => m.value === c);
          if (attr) {
            const ext = {
              colId: c, editable: false, type: 'text', headerName: attr.label, cellRenderer: DropTextRenderer, cellParams: { attr, sField: sF }
            };
            colDefExt.push(ext);
          }
        });
      }
      if (sF.type === 'drag_sample') {
        const sOpt = sValues.filter(o => o[sF.id] && o[sF.id].value && o[sF.id].value.is_new);
        const cellParams = { sField: sF, opt, onChange: this.onDrop };
        colDef = Object.assign({}, colDef, {
          cellRenderer: DropRenderer, cellParams, onCellChange: this.onCellChange, width: '5vw'
        });
        const addOption = {
          colId: 'sam_option', editable: false, type: 'text', headerName: '', cellRenderer: SampOption, cellParams: { sField: sF, onChange: this.onChk }, width: '3vw'
        };
        if (sOpt.length > 0) colDefExt.push(addOption);
        const addLink = {
          colId: 'sam_link', editable: false, type: 'text', headerName: 'Short label', cellRenderer: DropLinkRenderer, cellParams: { sField: sF }, width: '5vw'
        };
        colDefExt.push(addLink);
        const conf = ((sF.value || '').split(';') || []);
        conf.forEach((c) => {
          const attr = samOptions.find(m => m.value === c);
          if (attr) {
            const ext = {
              colId: c, editable: false, type: 'text', headerName: attr.label, cellRenderer: DropTextRenderer, cellParams: { attr, sField: sF }
            };
            colDefExt.push(ext);
          }
        });
      }
      columnDefs.push(colDef);
      if (colDefExt.length > 0) columnDefs = columnDefs.concat(colDefExt);
    });
    const act = {
      type: 'button',
      headerName: '',
      colId: opt.f_obj.field,
      headerComponent: AddRowBtn,
      headerParams: { addRow: this.addRow },
      cellRenderer: DelRowBtn,
      cellParams: { delRow: this.delRow },
      width: 'unset',
    };
    columnDefs.splice(0, 0, act);
    const dtype = `${DragDropItemTypes.GENERIC_GRID}_${opt.layer.key}_${opt.f_obj.field}`;
    const move = {
      type: 'dnd',
      field: opt.f_obj.field,
      headerName: '',
      colId: `${opt.f_obj.field}_dnd`,
      headerComponent: NullRowBtn,
      cellRenderer: DnDRowBtn,
      cellParams: { moveRow: this.moveRow, field: opt.f_obj.field, type: dtype },
      width: 'unset',
    };
    columnDefs.splice(0, 0, move);
    return columnDefs;
  }

  moveRow(source, target) {
    const { opt } = this.props;
    const alles = opt.f_obj.sub_values;
    const sid = alles.findIndex(e => e.id === source);
    const tid = alles.findIndex(e => e.id === target);
    const temp = alles[sid];
    alles[sid] = alles[tid];
    alles[tid] = temp;
    opt.onSubChange(0, 0, opt.f_obj, true);
  }

  delRow(rowData) {
    const { opt } = this.props;
    opt.f_obj.sub_values = opt.f_obj.sub_values.filter(s => s.id !== rowData.id);
    opt.onSubChange(0, 0, opt.f_obj, true);
  }

  addRow() {
    const { opt } = this.props;
    const subFields = opt.f_obj.sub_fields || [];
    const newSub = new GenericSubField();
    subFields.map((e) => {
      if (e.type === 'text') return Object.assign(newSub, { [e.id]: '' });
      return Object.assign(newSub, { [e.id]: { value: '', value_system: e.value_system } });
    });
    opt.f_obj.sub_values = opt.f_obj.sub_values || [];
    opt.f_obj.sub_values.push(newSub);
    opt.onSubChange(0, 0, opt.f_obj, true);
  }

  render() {
    const { opt } = this.props;
    const columnDefs = this.getColumns();
    if (opt.isSearchCriteria) return (<div>(This is a table)</div>);
    if ((opt.f_obj.sub_fields || []).length < 1) return null;
    return (
      <div>
        {ColumnHeader(columnDefs)}
        <div>{NoRow(opt.f_obj.sub_values)}</div>
        <div>{(opt.f_obj.sub_values || []).map(s => ColumnRow(columnDefs, s))}</div>
      </div>
    );
  }
}

TableRecord.propTypes = {
  opt: PropTypes.object.isRequired,
};
