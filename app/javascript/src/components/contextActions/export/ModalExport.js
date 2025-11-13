import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar, Dropdown, DropdownButton, Modal
} from 'react-bootstrap';
import CheckBoxList from 'src/components/common/CheckBoxList';
import UIStore from 'src/stores/alt/stores/UIStore';
import ReportsFetcher from 'src/fetchers/ReportsFetcher';

const filterUIState = (uiState) => {
  const {
    currentCollection, sample, reaction, wellplate, isSync
  } = uiState;
  return {
    sample: {
      checkedIds: sample.checkedIds.toArray(),
      uncheckedIds: sample.uncheckedIds.toArray(),
      checkedAll: sample.checkedAll,
    },
    reaction: {
      checkedIds: reaction.checkedIds.toArray(),
      uncheckedIds: reaction.uncheckedIds.toArray(),
      checkedAll: reaction.checkedAll,
    },
    wellplate: {
      checkedIds: wellplate.checkedIds.toArray(),
      uncheckedIds: wellplate.uncheckedIds.toArray(),
      checkedAll: wellplate.checkedAll,
    },
    currentCollection: currentCollection.id,
    isSync,
  };
};

const exportSelections = (uiState, columns, e) => {
  ReportsFetcher.createDownloadFile({ exportType: e, uiState: filterUIState(uiState), columns });
};

export default class ModalExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: {
        sample: [
          { value: 'cas', text: 'cas', checked: true },
          { value: ['sample_svg_file', 'molecule_svg_file'], text: 'image', checked: false },
          { value: 'name', text: 'name', checked: true },
          { value: 'molecule_name', text: 'molecule name', checked: false },
          { value: 'external_label', text: 'external label', checked: true },
          { value: 'short_label', text: 'short label', checked: false },
          { value: 'description', text: 'description', checked: false },
          { value: ['real_amount_value', 'real_amount_unit'], text: 'real amount', checked: true },
          { value: ['target_amount_value', 'target_amount_unit'], text: 'target amount', checked: false },
          { value: ['molarity_value', 'molarity_unit'], text: 'molarity', checked: false },
          { value: 'density', text: 'density', checked: false },
          { value: 'molfile', text: 'molfile', checked: false },
          //  {value: "purity", text: "purity", checked: false},
          { value: 'solvent', text: 'solvent', checked: false },
          { value: 'location', text: 'location', checked: false },
          { value: 'is_top_secret', text: 'is top secret?', checked: false },
          { value: 'dry_solvent', text: 'dry solvent', checked: false },
          //  {value: "ancestry", text: "ancestry", checked: false},
          { value: 'imported_readout', text: 'imported readout', checked: false },
          //  {value: "identifier", text: "identifier", checked: false},
          { value: 'melting_point', text: 'melting point', checked: false },
          { value: 'boiling_point', text: 'boiling point', checked: false },
          { value: 'created_at', text: 'created at', checked: true },
          { value: 'updated_at', text: 'updated at', checked: false },
          { value: 'user_labels', text: 'user labels', checked: false },
          { value: 'literature', text: 'literature', checked: false },
          { value: 'inventory_label', text: 'inventory label', checked: false },
          { value: 'refractive_index', text: 'refractive index', checked: false },
          { value: 'flash_point', text: 'flash point', checked: false },
          { value: 'solubility', text: 'solubility', checked: false },
          { value: 'color', text: 'color', checked: false },
          { value: 'form', text: 'form', checked: false },
          { value: 'height', text: 'Height', checked: false },
          { value: 'width', text: 'Width', checked: false },
          { value: 'length', text: 'Length', checked: false },
          { value: 'state', text: 'State', checked: false },
          { value: 'color', text: 'Color', checked: false },
          { value: 'storage_condition', text: 'Storage Conditions', checked: false },
        ],
        molecule: [
          { value: 'cano_smiles', text: 'canonical smiles', checked: true },
          { value: 'inchistring', text: 'InChIstring', checked: false },
          { value: 'inchikey', text: 'InChIkey', checked: false },
          { value: 'sum_formular', text: 'sum formula', checked: false },
          { value: 'molecular_weight', text: 'molecular weight', checked: false },
        ],
        reaction: [
          { value: 'name', text: 'reaction name', checked: true },
          { value: 'short_label', text: 'r short label', checked: true },
          { value: 'reference', text: 'reference', checked: false },
          { value: 'equivalent', text: 'equivalent', checked: false },
        ],
        wellplate: [
          { value: 'name', text: 'wellplate name', checked: false },
          { value: 'position_x', text: 'well x', checked: false },
          { value: 'position_y', text: 'well y', checked: false },
        ],
        analyses: [
          { value: 'name', text: 'analysis name', checked: false },
          { value: 'description', text: 'analysis description', checked: false },
          { value: 'kind', text: 'analysis type', checked: false },
          { value: 'content', text: 'analysis content', checked: false },
          { value: 'status', text: 'analysis status', checked: false },
          { value: 'uuid', text: 'uuid', checked: false },
          { value: 'dataset name', text: 'dataset name', checked: false },
          { value: 'dataset description', text: 'dataset description', checked: false },
          { value: 'instrument', text: 'instrument', checked: false },
          { value: 'filename', text: 'file name', checked: false },
          { value: 'checksum', text: 'file checksum', checked: false },
        ],
        chemicals: [
          { value: 'status', text: 'status', checked: false },
          { value: 'vendor', text: 'vendor', checked: false },
          { value: 'order_number', text: 'order number', checked: false },
          { value: 'amount', text: 'amount', checked: false },
          { value: 'price', text: 'price', checked: false },
          { value: 'person', text: 'person', checked: false },
          { value: 'required_date', text: 'required date', checked: false },
          { value: 'ordered_date', text: 'ordered date', checked: false },
          { value: 'expiration_date', text: 'expiration date', checked: false },
          { value: 'storage_temperature', text: 'storage temperature', checked: false },
          { value: 'required_by', text: 'required by', checked: false },
          {
            value: [
              'safety_sheet_link_merck',
              'safety_sheet_link_thermofischer'
            ],
            text: 'safety sheet link',
            checked: false,
          },
          { value: ['product_link_merck', 'product_link_thermofischer'], text: 'product link', checked: false },
          { value: 'pictograms', text: 'pictograms', checked: false },
          { value: 'h_statements', text: 'h statements', checked: false },
          { value: 'p_statements', text: 'p statements', checked: false },
          { value: 'host_building', text: 'host building', checked: false },
          { value: 'host_room', text: 'host room', checked: false },
          { value: 'host_cabinet', text: 'host cabinet', checked: false },
          { value: 'host_group', text: 'host group', checked: false },
          { value: 'owner', text: 'owner', checked: false },
          { value: 'current_building', text: 'current building', checked: false },
          { value: 'current_room', text: 'current room', checked: false },
          { value: 'current_cabinet', text: 'current cabinet', checked: false },
          { value: 'current_group', text: 'current group', checked: false },
          { value: 'borrowed_by', text: 'borrowed by', checked: false },
          { value: 'disposal_info', text: 'disposal info', checked: false },
          { value: 'important_notes', text: 'important notes', checked: false },
        ],
        components: [
          { value: 'name', text: 'component name', checked: false },
          { value: 'purity', text: 'purity', checked: false },
          { value: 'density', text: 'density', checked: false },
          { value: 'stock', text: 'stock', checked: false },
          { value: 'mass', text: 'mass', checked: false },
          { value: 'volume', text: 'volume', checked: false },
          { value: 'amount', text: 'amount', checked: false },
          { value: 'ratio', text: 'ratio', checked: false },
          { value: 'total concentration', text: 'total concentration', checked: false },
          { value: 'reference', text: 'reference', checked: false },
          { value: 'material group', text: 'material group', checked: false },
          { value: 'canonical smiles', text: 'canonical smiles', checked: false },
          { value: 'InChI', text: 'InChIkey', checked: false },
          { value: 'composition_table', text: 'Composition Table', checked: false },
        ],
      },
      checkedAllColumns: {
        sample: true,
        molecule: true,
        wellplate: false,
        reaction: true,
        analyses: false,
        chemicals: false,
        components: false,
      },
    };
    this.handleClick = this.handleClick.bind(this);

    this.toggleColumnsSample = this.toggleColumnsSample.bind(this);
    this.toggleColumnsAllSample = this.toggleColumnsAllSample.bind(this);
    this.toggleColumnsMolecule = this.toggleColumnsMolecule.bind(this);
    this.toggleColumnsAllMolecule = this.toggleColumnsAllMolecule.bind(this);
    this.toggleColumnsReaction = this.toggleColumnsReaction.bind(this);
    this.toggleColumnsAllReaction = this.toggleColumnsAllReaction.bind(this);
    this.toggleColumnsWellplate = this.toggleColumnsWellplate.bind(this);
    this.toggleColumnsAllWellplate = this.toggleColumnsAllWellplate.bind(this);
    this.toggleColumnsAnalyses = this.toggleColumnsAnalyses.bind(this);
    this.toggleColumnsAllAnalyses = this.toggleColumnsAllAnalyses.bind(this);
    this.toggleColumnsChemicals = this.toggleColumnsChemicals.bind(this);
    this.toggleColumnsAllChemicals = this.toggleColumnsAllChemicals.bind(this);
    this.toggleColumnsComponents = this.toggleColumnsComponents.bind(this);
    this.toggleColumnsAllComponents = this.toggleColumnsAllComponents.bind(this);
  }

  handleClick(e) {
    const uiState = UIStore.getState();
    const { onHide } = this.props;
    onHide();
    exportSelections(uiState, this.filteredColumns(), e);
  }

  toggleColumns(text, checked, section) {
    this.setState((prevState) => {
      const { columns } = prevState;
      columns[section] = columns[section].map((col) => {
        if (col.text === text) {
          return Object.assign({}, col, { checked: !checked })
        }
        return col;
      });
      return { ...prevState, columns };
    });
  }

  toggleColumnsSample(text, checked) {
    this.toggleColumns(text, checked, 'sample');
  }

  toggleColumnsReaction(text, checked) {
    this.toggleColumns(text, checked, 'reaction');
  }

  toggleColumnsMolecule(text, checked) {
    this.toggleColumns(text, checked, 'molecule');
  }

  toggleColumnsWellplate(text, checked) {
    this.toggleColumns(text, checked, 'wellplate');
  }

  toggleColumnsAnalyses(text, checked) {
    this.toggleColumns(text, checked, 'analyses');
  }

  toggleColumnsChemicals(text, checked) {
    this.toggleColumns(text, checked, 'chemicals');
  }

  toggleColumnsComponents(text, checked) {
    this.toggleColumns(text, checked, 'components');
  }

  toggleColumnsAll(section) {
    this.setState((prevState) => {
      const { columns, checkedAllColumns } = prevState;
      checkedAllColumns[section] = !checkedAllColumns[section];
      columns[section] = columns[section].map(
        (col) => Object.assign({}, col, { checked: checkedAllColumns[section] })
      );
      return { columns, checkedAllColumns };
    });
  }

  toggleColumnsAllSample() {
    this.toggleColumnsAll('sample');
  }

  toggleColumnsAllReaction() {
    this.toggleColumnsAll('reaction');
  }

  toggleColumnsAllMolecule() {
    this.toggleColumnsAll('molecule');
  }

  toggleColumnsAllWellplate() {
    this.toggleColumnsAll('wellplate');
  }

  toggleColumnsAllAnalyses() {
    this.toggleColumnsAll('analyses');
  }

  toggleColumnsAllChemicals() {
    this.toggleColumnsAll('chemicals');
  }

  toggleColumnsAllComponents() {
    this.toggleColumnsAll('components');
  }

  buttonBar() {
    const { onHide } = this.props;
    const chemicalColumns = this.filteredColumns();
    const hasNoSdfExportData = chemicalColumns.chemicals.length !== 0
      || chemicalColumns.components.length !== 0;

    return (
      <ButtonToolbar className="justify-content-end gap-1">
        <Button variant="primary" onClick={onHide}>Cancel</Button>
        <DropdownButton
          drop="up"
          variant="warning"
          id="md-export-dropdown"
          title="XLSX/SD Export"
          onSelect={this.handleClick}
        >
          <Dropdown.Item eventKey="1">XLSX Export</Dropdown.Item>
          <Dropdown.Item eventKey="2" disabled={hasNoSdfExportData}>SDF Export</Dropdown.Item>
        </DropdownButton>
      </ButtonToolbar>
    );
  }

  filteredColumns() {
    const { columns } = this.state;
    const tables = Object.keys(columns);
    return tables.reduce((filteredtables, table) => {
      filteredtables[table] = (columns[table] || []).reduce(
        (cols, column) => (column && column.checked ? cols.concat(column.value) : cols),
        []
      );
      return filteredtables;
    }, {});
  }

  render() {
    const { onHide } = this.props;
    const { columns, checkedAllColumns } = this.state;

    return (
      <Modal show onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Data to Export</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h4>Sample properties</h4>
          <CheckBoxList
            items={columns.sample}
            toggleCheckbox={this.toggleColumnsSample}
            toggleCheckAll={this.toggleColumnsAllSample}
            checkedAll={checkedAllColumns.sample}
          />
          <h4>Molecule properties</h4>
          <CheckBoxList
            items={columns.molecule}
            toggleCheckbox={this.toggleColumnsMolecule}
            toggleCheckAll={this.toggleColumnsAllMolecule}
            checkedAll={checkedAllColumns.molecule}
          />
          <h4>Reaction properties</h4>
          <CheckBoxList
            items={columns.reaction}
            toggleCheckbox={this.toggleColumnsReaction}
            toggleCheckAll={this.toggleColumnsAllReaction}
            checkedAll={checkedAllColumns.reaction}
          />
          <h4>Wellplate and well properties</h4>
          <CheckBoxList
            items={columns.wellplate}
            toggleCheckbox={this.toggleColumnsWellplate}
            toggleCheckAll={this.toggleColumnsAllWellplate}
            checkedAll={checkedAllColumns.wellplate}
          />
          <h4>Analyses</h4>
          <CheckBoxList
            items={columns.analyses}
            toggleCheckbox={this.toggleColumnsAnalyses}
            toggleCheckAll={this.toggleColumnsAllAnalyses}
            checkedAll={checkedAllColumns.analyses}
          />
          <h4>Chemicals</h4>
          <CheckBoxList
            items={columns.chemicals}
            toggleCheckbox={this.toggleColumnsChemicals}
            toggleCheckAll={this.toggleColumnsAllChemicals}
            checkedAll={checkedAllColumns.chemicals}
          />
          <h4>Components</h4>
          <CheckBoxList
            items={columns.components}
            toggleCheckbox={this.toggleColumnsComponents}
            toggleCheckAll={this.toggleColumnsAllComponents}
            checkedAll={checkedAllColumns.components}
          />
          {this.buttonBar()}
        </Modal.Body>
      </Modal>
    );
  }
}

ModalExport.propTypes = {
  onHide: PropTypes.func,
};
