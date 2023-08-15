import React, { useContext } from 'react';
import { Button, Checkbox, FormControl, FormGroup, ControlLabel, InputGroup, Tabs, Tab } from 'react-bootstrap'
import Select from 'react-select3';
import TreeSelect from 'antd/lib/tree-select';
import SelectFieldData from './SelectFieldData';
import SampleInventoryFieldData from './SampleInventoryFieldData';
import AnalysesFieldData from './AnalysesFieldData';
import MeasurementFieldData from './MeasurementFieldData';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import * as FieldOptions from 'src/components/staticDropdownOptions/options';

const DetailSearch = () => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.searchElement;
  let fieldOptions = SelectFieldData.fields[selection.table];
  const { rxnos, chmos, unitsSystem, segmentKlasses, genericEls, profile } = UserStore.getState();
  const layoutTabs = profile.data[`layout_detail_${selection.table.slice(0, -1)}`];
  const currentCollection = UIStore.getState().currentCollection;
  let tabSegment = currentCollection?.tabs_segment;
  let tabs = tabSegment && tabSegment[selection.table.slice(0, -1)] ? tabSegment[selection.table.slice(0, -1)] : layoutTabs;
  let genericFields = [];
  let genericSelectOptions = [];
  let fieldsByTab = [];
  let inventoryData = SampleInventoryFieldData.chemicals;
  let analysesData = AnalysesFieldData.containers;
  let measurementData = MeasurementFieldData.measurements;
  let validFieldTypes = ['text', 'select', 'checkbox', 'system-defined', 'textarea', 'input-group', 'formula-field', 'table'];

  const defaultDetailSearchValues = [{
    link: 'AND',
    match: 'LIKE',
    table: selection.table,
    element_id: selection.element_id,
    field: {
      column: '',
      label: '',
    },
    value: '',
    sub_values: [],
    unit: ''
  }];

  const addGenericFieldsByLayers = (layers, fields, segment) => {
    Object.entries(layers)
      .sort((a, b) => a[1].position - b[1].position)
      .map((value) => {
        let label = value[1].label || '';
        let values = value[1].fields.filter((f) => { return validFieldTypes.includes(f.type) });
        let mappedValues = [];
        if (values.length >= 1) {
          values.map((v) => {
            if (segment.id != undefined && v.table == undefined) {
              Object.assign(v, { table: 'segments', element_id: segment.id });
            }
            if (v.key == undefined) {
              Object.assign(v, { key: value[1].key });
            }
            mappedValues.push(v);
          });
          fields.push({ label: label, value: mappedValues });
        }
      });
  }

  const pushSegmentToSegmentField = (segment) => {
    let layers = segment.properties_template.layers;
    let options = segment.properties_template.select_options;
    if (options) {
      Object.assign(genericSelectOptions, options);
    }
    if (layers) {
      let segments = [];
      addGenericFieldsByLayers(layers, segments, segment);
      fieldsByTab.push({ label: segment.label, value: segments });
    }
  }

  if (genericEls) {
    let currentGenericElement = genericEls.find((e) => { return e.name === selection.element_table.slice(0, -1) });
    if (currentGenericElement) {
      let layers = currentGenericElement.properties_template.layers;
      let options = currentGenericElement.properties_template.select_options;
      if (options) {
        Object.assign(genericSelectOptions, options);
      }

      fieldOptions.map((o) => { genericFields.push(o) });
      addGenericFieldsByLayers(layers, genericFields, {});
      fieldsByTab.push({ label: 'Properties', value: genericFields });
      fieldsByTab.push(...analysesData);
    }
  }

  if (tabs) {
    Object.entries(tabs)
      .filter((value) => { return value[1] > 0 })
      .sort((a, b) => a[1] - b[1])
      .map((value) => {
        if (['properties', 'research_plan'].includes(value[0])) {
          fieldsByTab.push({ label: 'Properties', value: fieldOptions });
        }
        if (value[0] === 'analyses') {
          fieldsByTab.push(...analysesData);
        }
        if (value[0] === 'inventory') {
          fieldsByTab.push(...inventoryData);
        }
        if (value[0] === 'measurements') {
          fieldsByTab.push(...measurementData);
        }
        if (segmentKlasses) {
          segmentKlasses.filter((s) => {
            if (s.element_klass.name == selection.table.slice(0, -1) && s.label == value[0]) {
              pushSegmentToSegmentField(s);
            }
          });
        }
      });
  }

  const textInput = (option, type, selectedValue, column, keyLabel) => {
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <FormControl
          id={`input_${column}`}
          type="text"
          key={`${column}-${keyLabel}`}
          value={selectedValue ? selectedValue[column].value : ''}
          onChange={handleFieldChanged(option, column, type)}
        />
      </FormGroup>
    );
  }

  const checkboxInput = (option, type, selectedValue, column, keyLabel) => {
    return (
      <Checkbox
        key={`${column}-${keyLabel}`}
        checked={selectedValue ? selectedValue[column].value : false}
        onChange={handleFieldChanged(option, column, type)}
      >
        {option.label}
      </Checkbox>
    );
  }

  const optionsForSelect = (option) => {
    let options = [];
    let genericOptions = [];

    if (option.field !== undefined) {
      genericOptions = genericFields.length >= 1 ? genericFields : fieldsByTab;
    }

    if (option.type == 'system-defined') {
      let systemOptions = unitsSystem.fields.find((u) => { return u.field === option.option_layers });
      options = systemOptions.units;
      if (option.column && option.column == 'duration') {
        options = FieldOptions.durationOptions;
      }
    } else if (genericOptions.length >= 1 && genericSelectOptions[option.option_layers]) {
      Object.values(genericSelectOptions[option.option_layers].options).forEach((option) => {
        option.value = option.label;
        options.push(option);
      });
    } else {
      options = FieldOptions[option.option_layers];
    }
    if (options && options[0] && options[0].value !== '' && option.type !== 'system-defined') {
      options.unshift({ label: '', value: '' });
    }
    return options;
  }

  const selectInput = (option, type, selectedValue, columnName, keyLabel) => {
    let options = optionsForSelect(option);
    return (
      <FormGroup key={`${columnName}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <Select
          name={columnName}
          key={`${columnName}-${keyLabel}`}
          options={options}
          onChange={handleFieldChanged(option, columnName, type)}
          value={selectedValue ? options.filter((f) => { return f.value == selectedValue[columnName].value }) : ''}
        />
      </FormGroup>
    );
  }

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  const rxnoChmosInput = (option, type, selectedValue, column) => {
    let options = type == 'chmos' ? chmos : rxnos;
    if (options[0].value !== '') { options.unshift({ search: '', title: '', value: '', is_enabled: true }); }
    return (
      <FormGroup key={`${option.column}-${option.label}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <TreeSelect
          key={option.column}
          value={selectedValue ? selectedValue[column].value : ''}
          treeData={options}
          placeholder="Select type"
          dropdownStyle={{ maxHeight: '250px' }}
          onChange={handleFieldChanged(option, column, type)}
          filterTreeNode={filterTreeNode}
        />
      </FormGroup>
    );
  }

  const textWithAddOnInput = (option, type, selectedValue, keyLabel) => {
    let column = option.column || option.field;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <InputGroup>
          <FormControl
            id={`input_${column}`}
            type="text"
            key={`${column}-${keyLabel}`}
            value={selectedValue ? selectedValue[column].value : ''}
            onChange={handleFieldChanged(option, column, type)}
          />
          <InputGroup.Addon>{option.addon}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
    );
  }

  const ButtonOrAddOn = (units, value, column, option, subFieldId) => {
    if (units.length > 1) {
      return (
        <InputGroup.Button>
          <Button key={units} bsStyle="success"
            dangerouslySetInnerHTML={{ __html: value }}
            onClick={changeUnit(units, value, column, option, subFieldId)} />
        </InputGroup.Button>
      );
    } else {
      return (
        <InputGroup.Addon dangerouslySetInnerHTML={{ __html: value }} />
      );
    }
  }

  const systemDefinedInput = (option, type, selectedValue, column, keyLabel) => {
    let units = optionsForSelect(option);
    let value = selectedValue ? selectedValue[column].unit : units[0].label;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <InputGroup>
          <FormControl
            id={`input_${column}`}
            type="text"
            key={`${column}-${keyLabel}`}
            value={selectedValue ? selectedValue[column].value : ''}
            onChange={handleFieldChanged(option, column, type)}
          />
          {ButtonOrAddOn(units, value, column, option, '')}
        </InputGroup>
      </FormGroup>
    );
  }

  const inputGroupInput = (option, type, selectedValue, column, keyLabel) => {
    let subFields = [];
    option.sub_fields.map((field) => {
      if (field.type == 'label') {
        subFields.push(<span key={field.id} className="form-control g_input_group_label">{field.value}</span>);
      }
      if (field.type == 'text') {
        let subValue = selectedValue && selectedValue[column].sub_values[0][field.id] !== undefined ? selectedValue[column].sub_values[0][field.id] : '';
        subFields.push(
          <FormControl
            className="g_input_group" 
            key={field.id}
            type={field.type}
            name={field.id}
            value={subValue}
            onChange={handleSubFieldChanged(field.id, option, column, type)}
          />
        );
      }
    });

    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <InputGroup style={{ display: 'flex' }}>
          {subFields}
        </InputGroup>
      </FormGroup>
    );
  }

  const tableInputFields = (option, type, selectedValue, column, keyLabel) => {
    let subFields = [];

    option.sub_fields.map((field) => {
      let condition =
        selectedValue && selectedValue[column].sub_values !== undefined
        && selectedValue[column].sub_values[0][field.id] !== undefined;
      let selectedFieldValue = condition ? selectedValue[column].sub_values[0][field.id] : '';
      let selectedUnitValue = typeof selectedFieldValue === 'object' ? selectedFieldValue.value_system : field.value_system;      
      selectedFieldValue = typeof selectedFieldValue === 'object' ? selectedFieldValue.value : selectedFieldValue;
      let units = optionsForSelect(field);
      let formElement = '';

      if (field.type == 'text') {
        formElement = (
          <FormControl
            id={field.id}
            type="text"
            key={field.id}
            value={selectedFieldValue}
            onChange={handleTableFieldChanged(field.id, option, column, type)}
          />
        );
      }
      if (field.type == 'system-defined') {
        formElement = (
          <InputGroup>
            <FormControl
              id={field.id}
              type="text"
              key={field.id}
              value={selectedFieldValue}
              onChange={handleTableFieldChanged(field.id, option, column, type)}
            />
            {ButtonOrAddOn(units, selectedUnitValue, column, option, field.id)}
          </InputGroup>
        );
      }
      if (formElement) {
        subFields.push(
          <FormGroup key={`${column}-${keyLabel}-${type}-${field.id}`}>
            <ControlLabel>{field.col_name}</ControlLabel>
            {formElement}
          </FormGroup>
        );
      }
    });
    return subFields;
  }

  const subGroupWithAddOnFields = (option, type, selectedValue, column, keyLabel) => {
    let subFields = [];

    option.sub_fields.map((field) => {
      let subValue = selectedValue && selectedValue[column].sub_values[0][field.key] !== undefined ? selectedValue[column].sub_values[0][field.key] : '';
      subFields.push(
        <FormGroup key={`${column}-${keyLabel}-${field.key}`} className={`subfields-with-addon-left-${option.sub_fields.length}`}>
          <InputGroup>
            <InputGroup.Addon>{field.addon}</InputGroup.Addon>
            <FormControl
              id={`input_${column}_${field.key}`}
              type="text"
              key={`${column}-${keyLabel}-${field.key}`}
              value={subValue}
              onChange={handleSubFieldChanged(field.key, option, column, type)}
            />
          </InputGroup>
        </FormGroup>
      );
    });

    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`} className="sub-group-with-addon-2col">
        <ControlLabel>{option.label}</ControlLabel>
        <FormGroup className="grouped-sub-fields">
          {subFields}
        </FormGroup>
      </FormGroup>
    );
  }

  const componentHeadline = (label, i, className) => {
    if (label === '') { return '' }

    return (
      <div className={className} key={`${label}-${i}`}>{label}</div>
    );
  }

  const valueByType = (type, e) => {
    switch (type) {
      case 'text':
      case 'textarea':
      case 'textWithAddOn':
      case 'system-defined':
      case 'formula-field':
      case 'subGroupWithAddOn':
        return e.target.value;
      case 'checkbox':
        return e.target.checked;
      case 'select':
        return e.value ? e.value : e.label;
      default:
        return e;
    }
  }

  const matchByField = (field, type) => {
    switch (field) {
      case 'boiling_point':
      case 'melting_point':
        return '@>';
      case 'density':
      case 'molarity_value':
      case 'target_amount_value':
      case 'temperature':
      case 'duration':
      case 'purity':
      case 'value_measurement':
      case 'solvent_ratio':
        return '>=';
      case 'unit_measurement':
        return '=';
      default:
        return type == 'system-defined' ? '>=' : 'LIKE';
    }
  }

  const searchValueByStoreOrDefaultValue = (column) => {
    let index = searchStore.detailSearchValues.findIndex((f) => { return Object.keys(f).indexOf(column) != -1; });
    return (index !== -1 ? { ...searchStore.detailSearchValues[index][column] } : defaultDetailSearchValues[0]);
  }

  const handleSubFieldChanged = (id, option, column, type) => (e) => {
    let sub_values = { id: id, value: e.target.value };
    setSearchStoreValues(e.target.value, option, column, type, sub_values);
  }

  const handleTableFieldChanged = (id, option, column, type) => (e) => {
    let value = e.target.value;
    let subValue = {};
    let optionField = option.sub_fields.find((f) => { return f.id == id });
    let searchValue = searchValueByStoreOrDefaultValue(column);

    if (optionField.value_system) {
      let valueSystem =
        searchValue.sub_values.length >= 1 && searchValue.sub_values[0][id] ? searchValue.sub_values[0][id].value_system : optionField.value_system;
      subValue = { id: id, value: { value: value, value_system: valueSystem } };
    } else {
      subValue = { id: id, value: value };
    }
    setSearchStoreValues(e.target.value, option, column, type, subValue);
  }

  const handleFieldChanged = (option, column, type) => (e) => {
    let value = valueByType(type, e);
    setSearchStoreValues(value, option, column, type, {});
  }

  const setSearchStoreValues = (value, option, column, type, subValue) => {
    let searchValue = searchValueByStoreOrDefaultValue(column);
    searchValue.field = option;
    searchValue.value = value;
    searchValue.sub_values = subValuesForSearchValue(searchValue, subValue, value);
    searchValue.match = matchByField(column, type);

    if (type == 'system-defined' && searchValue.unit === '') {
      let units = optionsForSelect(option);
      searchValue.unit = units[0].label;
    }
    let searchSubValuesLength = searchValue.sub_values.length >= 1 ? Object.keys(searchValue.sub_values[0]).length : 0;
    let typesWithSubValues = ['input-group', 'table'];

    if (((value === '' || value === false) && !typesWithSubValues.includes(type)) || (searchSubValuesLength === 0 && typesWithSubValues.includes(type) && value === '')) {
      searchStore.removeDetailSearchValue(column);
    } else {
      searchStore.addDetailSearchValue(column, searchValue);
    }
  }

  const subValuesForSearchValue = (searchValue, subValue, value) => {
    let subValues = searchValue.sub_values;
    if (Object.keys(subValue).length === 0) { return subValues; }

    if (subValues.length == 0) {
      subValues.push({ [subValue.id]: subValue.value })
    } else {
      subValues[0][subValue.id] = subValue.value;
    }

    if (subValues[0][subValue.id] == '' && value == '') {
      delete subValues[0][subValue.id];
    }

    return subValues;
  }

  const changeUnit = (units, value, column, option, subFieldId) => (e) => {
    let activeUnitIndex = units.findIndex((f) => { return f.label.replace('°', '') === value || f.label === value });
    let nextUnitIndex = activeUnitIndex === units.length - 1 ? 0 : activeUnitIndex + 1;
    let newUnit = units[nextUnitIndex].label;
    let searchValue = searchValueByStoreOrDefaultValue(column);

    if (option.sub_fields && subFieldId) {
      if (searchValue.sub_values && searchValue.sub_values[0][subFieldId]) {
        searchValue.sub_values[0][subFieldId].value_system = newUnit;
      } else if (searchValue.sub_values && !searchValue.sub_values[0][subFieldId]) {
        searchValue.sub_values[0][subFieldId] = { value: '', value_system: newUnit };
      } else {
        searchValue.sub_values.push({ [subFieldId]: { value: '', value_system: newUnit } });
      }
    }

    searchValue.unit = newUnit;
    searchStore.addDetailSearchValue(column, searchValue);
  }

  const fieldsByType = (option, fields, keyLabel, i) => {
    let multi_fields = ['stereo', 'xref', 'solvent'];
    let column = multi_fields.includes(option.column) ? `${option.column}_${option.opt}` : (option.column || option.field);
    column = option.key !== undefined ? `${column}_${option.key}` : column;
    const selectedValue = searchStore.detailSearchValues.find((f) => { return Object.keys(f).indexOf(column) != -1 });

    switch (option.type) {
      case 'text':
      case 'textarea':
      case 'formula-field':
        fields.push(textInput(option, 'text', selectedValue, column, keyLabel));
        break;
      case 'checkbox':
        fields.push(checkboxInput(option, 'checkbox', selectedValue, column, keyLabel));
        break;
      case 'select':
        fields.push(selectInput(option, 'select', selectedValue, column, keyLabel));
        break;
      case 'textWithAddOn':
        fields.push(textWithAddOnInput(option, 'textWithAddOn', selectedValue, keyLabel));
        break;
      case 'rxnos':
      case 'chmos':
        fields.push(rxnoChmosInput(option, option.type, selectedValue, column));
        break;
      case 'system-defined':
        fields.push(systemDefinedInput(option, 'system-defined', selectedValue, column, keyLabel));
        break;
      case 'input-group':
        fields.push(inputGroupInput(option, 'input-group', selectedValue, column, keyLabel));
        break;
      case 'table':
        fields.push(componentHeadline(option.label, 'table', 'detail-search-headline'));
        fields.push(tableInputFields(option, 'table', selectedValue, column, keyLabel));
        break;
      case 'subGroupWithAddOn':
        fields.push(subGroupWithAddOnFields(option, 'subGroupWithAddOn', selectedValue, column, keyLabel));
        break;
      case 'spacer':
        fields.push(<div class="form-group"></div>);
        break;
      case 'headline':
        fields.push(componentHeadline(option.label, 'headline', 'detail-search-headline'));
        break;
      case 'hr':
        fields.push(<hr className='generic-spacer' key={`spacer-${i}`} />);
        break;
    }
    return fields;
  }

  const mapOptions = (options, fields) => {
    options.map((field, i) => {
      if (Array.isArray(field.value)) {
        if (field.label) {
          fields.push(componentHeadline(field.label, i, 'detail-search-headline'));
        } else if (i != 0 && field.value[0].type !== 'table') {
          fields.push(<hr className='generic-spacer' key={`spacer-${i}`} />);
        }

        field.value.map((option) => {
          fields = fieldsByType(option, fields, field.label, i);
        });
      } else {
        fields = fieldsByType(field.value, fields, selection.table, i);
      }
    });
    return fields;
  }

  const handleSelectTab = (e) => {
    searchStore.changeActiveTabKey(e);
  }

  const addTabToTabFields = (title, value, i, tabFields) => {
    tabFields.push(
      <Tab
        eventKey={i}
        title={title}
        key={`${title.toLowerCase().replace(' ', '-')}-${i}-${value}`}
      >
        {mapOptions(value, [])}
      </Tab>
    );
    return tabFields;
  }

  const FormElementTabs = () => {
    let tabFields = [];

    if (fieldsByTab.length >= 1) {
      fieldsByTab.map((field, i) => {
        addTabToTabFields(field.label, field.value, i, tabFields)
      });
    }

    return (
      <Tabs
        activeKey={searchStore.activeTabKey}
        animation={false}
        onSelect={handleSelectTab}
        id="detail-search-form-element-tabs"
        key="form-element-tabs"
      >
        {tabFields}
      </Tabs >
    );
  }

  return (
    <div className='detail-search'>
      {FormElementTabs()}
    </div>
  );
}
export default observer(DetailSearch);
