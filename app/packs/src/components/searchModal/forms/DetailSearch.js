import React, { useContext } from 'react';
import { Button, Checkbox, FormControl, FormGroup, ControlLabel, InputGroup, Tabs, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap'
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
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import * as FieldOptions from 'src/components/staticDropdownOptions/options';

const DetailSearch = () => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.searchElement;
  let fieldOptions = SelectFieldData.fields[selection.table];
  const { rxnos, chmos, unitsSystem, segmentKlasses, genericEls, dsKlasses, profile } = UserStore.getState();
  const layoutTabs = profile.data[`layout_detail_${selection.table.slice(0, -1)}`];
  const currentCollection = UIStore.getState().currentCollection;
  let tabSegment = currentCollection?.tabs_segment;
  let tabs = tabSegment && tabSegment[selection.table.slice(0, -1)] ? tabSegment[selection.table.slice(0, -1)] : layoutTabs;
  let genericFields = [];
  let genericSelectOptions = [];
  let fieldsByTab = [];
  let datasetOptions = [];
  let datasetSelectOptions = [];
  let inventoryData = SampleInventoryFieldData.chemicals;
  let analysesData = AnalysesFieldData.containers;
  let measurementData = MeasurementFieldData.measurements;
  let validFieldTypes = ['text', 'select', 'checkbox', 'system-defined', 'textarea', 'input-group', 'formula-field', 'table'];

  const defaultDetailSearchValues = [{
    link: 'AND',
    match: 'ILIKE',
    table: selection.table,
    element_id: selection.element_id,
    field: {
      column: '',
      label: '',
    },
    value: '',
    smiles: '',
    sub_values: [],
    unit: '',
    validationState: null
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

  const addGenericDatasetFieldsByLayers = (layers, fields, dataset) => {
    Object.entries(layers)
      .sort((a, b) => a[1].position - b[1].position)
      .map((value) => {
        let label = value[1].label || '';
        let values = value[1].fields.filter((f) => { return validFieldTypes.includes(f.type) });
        let mappedValues = [];
        if (values.length >= 1) {
          values.map((v) => {
            if (v.key == undefined) {
              Object.assign(v, { key: value[1].key });
            }
            if (v.table === undefined) {
              Object.assign(v, { table: 'datasets', column: `datasets_${v.field}`, term_id: dataset.ols_term_id });
            }
            mappedValues.push(v);
          });

          const valueExists = fields.filter((f) => {
            return f.value.length === mappedValues.length && f.label === label && f.term_id === dataset.ols_term_id
          });

          if (valueExists.length < 1) {
            fields.push(
              {
                label: label, value: mappedValues, term_id: dataset.ols_term_id,
                cond_fields: [{ field: 'datasets_type', value: dataset.ols_term_id }],
              }
            );
          }
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

  const pushDatasetsToAnalysesFields = () => {
    if (!dsKlasses) { return; }

    let analysesTab = fieldsByTab.find((tabs) => tabs.label === 'Analyses');
    const headlineExists = analysesTab.value.filter((t) => { return t.value.type === 'headline' })

    if (headlineExists.length < 1) {
      analysesTab.value.push(
        {
          value: {
            type: 'headline',
            label: 'Dataset metadata',
          },
          label: 'Dataset metadata',
        },
        {
          label: 'Datasets',
          value: {
            column: 'datasets_type',
            label: 'Dataset type',
            type: 'select',
            option_layers: 'datasets',
            table: 'datasets',
          },
        }
      );
    }

    dsKlasses.forEach((dataset) => {
      addGenericDatasetFieldsByLayers(dataset.properties_template.layers, analysesTab.value, dataset);
    });
  }

  if (dsKlasses) {
    dsKlasses.forEach((dataset) => {
      datasetOptions.push({ key: dataset.ols_term_id, label: dataset.label, value: dataset.ols_term_id });
      if (dataset.properties_template.select_options) {
        Object.entries(dataset.properties_template.select_options).map((options) => {
          datasetSelectOptions[`${options[0]}_${dataset.ols_term_id.replace(':', '_')}`] = options[1];
        });
      }
    });
    Object.assign(
      genericSelectOptions,
      {
        datasets: { options: datasetOptions },
        dataset_select: { options: datasetSelectOptions }
      }
    );
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
          pushDatasetsToAnalysesFields();
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

  const labelWithInfo = (option) => {
    let infoButton = ''
    if (option.info) {
      infoButton = (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={option.column}>{option.info}</Tooltip>
          }
        >
          <span className="glyphicon glyphicon-info-sign search-info-button" />
        </OverlayTrigger>
      );
    }

    return (
      <ControlLabel>{option.label}{infoButton}</ControlLabel>
    );
  }

  const textInput = (option, type, selectedValue, column, keyLabel) => {
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`} validationState={validationState}>
        {labelWithInfo(option)}
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
    let optionKey = '';
    let datasetOptionsByKey = [];

    if (option.field !== undefined) {
      genericOptions = genericFields.length >= 1 ? genericFields : fieldsByTab;
    }
    if (option.term_id && genericSelectOptions['dataset_select']) {
      optionKey = `${option.option_layers}_${option.term_id.replace(':', '_')}`;
      datasetOptionsByKey = genericSelectOptions['dataset_select'].options[optionKey];
    }

    if (option.type == 'system-defined') {
      let systemOptions = unitsSystem.fields.find((u) => { return u.field === option.option_layers });

      if (option.column && option.column == 'duration') {
        options = FieldOptions.durationOptions;
      } else if (option.column && option.column == 'target_amount_value') {
        options = FieldOptions.amountSearchOptions;
      } else {
        options = systemOptions.units;
      }
    } else if (option.term_id && optionKey && datasetOptionsByKey) {
      Object.values(datasetOptionsByKey.options).forEach((selectOption) => {
        selectOption.value = selectOption.value ? selectOption.value : selectOption.label;
        options.push(selectOption);
      });
    } else if ((genericOptions.length >= 1 || option.column === 'datasets_type')
      && genericSelectOptions[option.option_layers]) {
      Object.values(genericSelectOptions[option.option_layers].options).forEach((selectOption) => {
        selectOption.value = selectOption.value ? selectOption.value : selectOption.label;
        options.push(selectOption);
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
        {labelWithInfo(option)}
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

  const solventOptions = Object.keys(ionic_liquids).reduce(
    (solvents, ionicLiquid) => solvents.concat({
      label: ionicLiquid,
      value: {
        external_label: ionicLiquid,
        smiles: ionic_liquids[ionicLiquid],
        density: 1.0
      }
    }), FieldOptions.defaultMultiSolventsSmilesOptions
  );

  const solventSelect = (option, type, selectedValue, columnName, keyLabel) => {
    let options = solventOptions;
    options.unshift({ label: '', value: '' });
    return (
      <FormGroup key={`${columnName}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <Select
          name={columnName}
          key={`${columnName}-${keyLabel}`}
          options={solventOptions}
          onChange={handleFieldChanged(option, columnName, type)}
          value={selectedValue ? solventOptions.filter((f) => { return f.label == selectedValue[columnName].value }) : ''}
        />
      </FormGroup>
    );
  }

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  const rxnoChmosInput = (option, type, selectedValue, column) => {
    let options = type == 'chmos' ? chmos : rxnos;
    return (
      <FormGroup key={`${option.column}-${option.label}-${type}`}>
        {labelWithInfo(option)}
        <TreeSelect
          key={option.column}
          value={selectedValue ? selectedValue[column].value : ''}
          treeData={options}
          placeholder="Select type"
          dropdownStyle={{ maxHeight: '250px', zIndex: '800000' }}
          allowClear
          onChange={handleFieldChanged(option, column, type)}
          filterTreeNode={filterTreeNode}
        />
      </FormGroup>
    );
  }

  const textWithAddOnInput = (option, type, selectedValue, keyLabel) => {
    let column = option.column || option.field;
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`} validationState={validationState}>
        {labelWithInfo(option)}
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
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`} validationState={validationState}>
        {labelWithInfo(option)}
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
        {labelWithInfo(option)}
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
      let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
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
          <FormGroup key={`${column}-${keyLabel}-${type}-${field.id}`} validationState={validationState}>
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
      let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
      subFields.push(
        <FormGroup
          key={`${column}-${keyLabel}-${field.key}`}
          className={`subfields-with-addon-left-${option.sub_fields.length}`}
          validationState={validationState}
        >
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
        {labelWithInfo(option)}
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
      case 'solventSelect':
        return e.label;
      default:
        return e;
    }
  }

  const matchByField = (field, type) => {
    switch (field) {
      case 'boiling_point':
      case 'melting_point':
        return '<@';
      case 'density':
      case 'molarity_value':
      case 'target_amount_value':
      case 'temperature':
      case 'duration':
      case 'purity':
      case 'value_measurement':
      case 'solvent_ratio':
      case 'molecular_mass':
        return '>=';
      case 'unit_measurement':
      case 'solvent_smiles':
        return '=';
      default:
        return type == 'system-defined' ? '>=' : 'ILIKE';
    }
  }

  const checkValueForNumber = (label, value) => {
    if (value === '') { return null; }

    let validationState = null;
    let message = `${label}: Only numbers are allowed`;
    searchStore.removeErrorMessage(message);

    const regex = /^[0-9\s\-]+$/;
    let numericCheck = label.includes('point') ? !regex.test(value) : isNaN(Number(value));

    if (numericCheck) {
      searchStore.addErrorMessage(message);
      validationState = 'error';
    }

    return validationState;
  }

  const searchValueByStoreOrDefaultValue = (column) => {
    let index = searchStore.detailSearchValues.findIndex((f) => { return Object.keys(f).indexOf(column) != -1; });
    return (index !== -1 ? { ...searchStore.detailSearchValues[index][column] } : defaultDetailSearchValues[0]);
  }

  const handleSubFieldChanged = (id, option, column, type) => (e) => {
    let sub_values = { id: id, value: e.target.value };
    setSearchStoreValues(e.target.value, option, column, type, sub_values, '');
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
    setSearchStoreValues(e.target.value, option, column, type, subValue, '');
  }

  const handleFieldChanged = (option, column, type) => (e) => {
    let value = valueByType(type, e);
    let smiles = column == 'solvent_smiles' ? e.value.smiles : '';

    if (column === 'datasets_type') {
      let datasetValues = searchStore.detailSearchValues.filter((f) => {
        return Object.keys(f)[0].startsWith('datasets_') && Object.keys(f)[0] !== 'datasets_type'
      });
      datasetValues.map((d) => {
        searchStore.removeDetailSearchValue(Object.keys(d)[0]);
      });
    }

    setSearchStoreValues(value, option, column, type, {}, smiles);
  }

  const setSearchStoreValues = (value, option, column, type, subValue, smiles) => {
    let searchValue = searchValueByStoreOrDefaultValue(column);
    let cleanedValue = ['>=', '<@'].includes(searchValue.match) ? value.replace(/,/g, '.') : value;
    searchValue.field = option;
    searchValue.value = cleanedValue;
    searchValue.sub_values = subValuesForSearchValue(searchValue, subValue, cleanedValue);
    searchValue.match = matchByField(column, type);
    searchValue.smiles = smiles;

    if (['>=', '<@'].includes(searchValue.match)) {
      searchValue.validationState = checkValueForNumber(option.label, cleanedValue);
    }

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
      if (searchValue.sub_values.length >= 1 && searchValue.sub_values[0][subFieldId]) {
        searchValue.sub_values[0][subFieldId].value_system = newUnit;
      } else if (searchValue.sub_values.length >= 1 && !searchValue.sub_values[0][subFieldId]) {
        searchValue.sub_values[0][subFieldId] = { value: '', value_system: newUnit };
      } else {
        searchValue.sub_values.push({ [subFieldId]: { value: '', value_system: newUnit } });
      }
    }

    searchValue.unit = newUnit;
    searchStore.addDetailSearchValue(column, searchValue);
  }

  const fieldsByType = (option, fields, keyLabel, i) => {
    let multi_fields = ['stereo', 'xref', 'solvent', 'body'];
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
      case 'solventSelect':
        fields.push(solventSelect(option, 'solventSelect', selectedValue, column, keyLabel));
        break;
      case 'spacer':
        fields.push(<div className="form-group" key={`empty-column-${i}`}></div>);
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
      if (field.cond_fields && field.cond_fields.length >= 1) {
        let key = field.cond_fields[0].field;
        const valueFulfilled = searchStore.detailSearchValues.filter((value) => {
          return value[key] && value[key].value === field.cond_fields[0].value;
        });
        if (valueFulfilled.length === 0) { return }
      }

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
        key={`tab-${title.toLowerCase().replace(' ', '-')}-${i}`}
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
