import { cloneDeep } from 'lodash';
import { unitConversion } from 'src/apps/admin/generic/Utils';
import GenericSubField from 'src/models/GenericSubField';

const collateValues = (currentFields, previousFields, previousValues) => {
  const result = [];
  let newSub = new GenericSubField();
  currentFields.map(e => Object.assign(newSub, { [e.id]: '' }));
  const currentValuKeys = Object.keys(newSub);
  const previousValueKeys = Object.keys(previousValues[0]);
  const notInCurrent = previousValueKeys.filter(e => !currentValuKeys.includes(e));
  const currObj = {};
  currentFields.map((c) => {
    if (c.type === 'text') return Object.assign(currObj, { [c.id]: '' });
    return Object.assign(currObj, { [c.id]: { value: '', value_system: c.value_system } });
  });
  previousValues.forEach((e) => {
    newSub = new GenericSubField();
    Object.assign(newSub, currObj, e);
    notInCurrent.forEach(c => delete newSub[c]);
    previousValueKeys.forEach((preKey) => {
      if (newSub[preKey] === undefined || preKey === 'id') return;
      const curr = currentFields.find(f => f.id === preKey);
      const prev = previousFields.find(f => f.id === preKey);
      if (curr.type === 'drag_molecule') {
        if (['text', 'system-defined', 'drag_sample'].includes(prev.type)) {
          newSub[preKey] = { value: undefined };
        }
      }
      if (curr.type === 'text') {
        if (prev.type === 'system-defined') {
          newSub[preKey] = newSub[preKey].value;
        }
        if (['drag_molecule', 'drag_sample'].includes(prev.type)) {
          newSub[preKey] = '';
        }
      }
      if (curr.type === 'system-defined') {
        if (prev.type === 'system-defined' && (curr.option_layers !== prev.option_layers)) {
          newSub[preKey].value_system = curr.value_system;
        }
        if (['text', 'drag_molecule', 'drag_sample'].includes(prev.type)) {
          newSub[preKey] = { value: '', value_system: curr.value_system };
        }
        newSub[preKey].value =
          unitConversion(curr.option_layer, newSub[preKey].value_system, newSub[preKey].value);
      }
    });
    result.push(newSub);
  });
  return result;
};

const organizeSubValues = (cur, pre) => {
  const currentFields = cloneDeep(cur.sub_fields || []);
  const previousFields = cloneDeep(pre.sub_fields || []);
  const previousValues = cloneDeep(pre.sub_values || []);
  if (currentFields.length < 1 ||
    previousFields.length < 1 || previousValues.length < 1) {
    return [];
  }
  return collateValues(currentFields, previousFields, previousValues);
};

// eslint-disable-next-line import/prefer-default-export
export { organizeSubValues };
