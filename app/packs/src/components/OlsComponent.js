import React, { Component } from 'react';
import TreeSelect from 'antd/lib/tree-select';
import PropTypes from 'prop-types';
import UserStore from './stores/UserStore';

const filterTreeNode = (input, child) => {
  return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
};
export default class OlsTreeSelect extends Component {
  constructor(props) {
    super(props);
    this.OnSelectChange = this.OnSelectChange.bind(this);
  }

  OnSelectChange(e) {
    const sel = e || '';
    this.props.onSelectChange(sel, this.props.selectName);
  }

  render() {
    const { rxnos, chmos } = UserStore.getState();
    let treeData = [];
    switch (this.props.selectName) {
      case 'rxno':
        treeData = rxnos;
        break;
      case 'chmo':
        treeData = chmos;
        break;
      default:
        break;
    }

    return (
      <TreeSelect
        treeDefaultExpandedKeys={[this.props.selectName]}
        name={this.props.selectName}
        showSearch
        style={{ width: '100%' }}
        value={this.props.selectedValue}
        dropdownStyle={{ maxHeight: 300, maxWidth: '10vw', overflow: 'auto' }}
        treeData={treeData}
        placeholder="Select..."
        allowClear
        onChange={e => this.OnSelectChange(e)}
        disabled={this.props.selectedDisable}
        filterTreeNode={filterTreeNode}
      />
    );
  }
}

OlsTreeSelect.propTypes = {
  selectName: PropTypes.string.isRequired,
  selectedValue: PropTypes.string.isRequired,
  onSelectChange: PropTypes.func.isRequired,
  selectedDisable: PropTypes.bool.isRequired,
};

export const chmoConversions = {
  nmr_1h: {
    label: '1H nuclear magnetic resonance spectroscopy (1H NMR)',
    termId: 'CHMO:0000593',
    value: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)',
  },
  nmr_13c: {
    label: '13C nuclear magnetic resonance spectroscopy (13C NMR)',
    termId: 'CHMO:0000595',
    value: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)',
  },
  mass: {
    label: 'mass spectrometry (MS)',
    termId: 'CHMO:0000470',
    value: 'CHMO:0000470 | mass spectrometry (MS)',
  },
  ea: {
    label: 'elemental analysis (EA)',
    termId: 'CHMO:0001075',
    value: 'CHMO:0001075 | elemental analysis (EA)',
  },
  gcms: {
    label: 'gas chromatography-mass spectrometry (GCMS)',
    termId: 'CHMO:0000497',
    value: 'CHMO:0000497 | gas chromatography-mass spectrometry (GCMS)',
  },
  hplc: {
    label: 'high-performance liquid chromatography (HPLC)',
    termId: 'CHMO:0001009',
    value: 'CHMO:0001009 | high-performance liquid chromatography (HPLC)',
  },
  ir: {
    label: 'infrared absorption spectroscopy (IR)',
    termId: 'CHMO:0000630',
    value: 'CHMO:0000630 | infrared absorption spectroscopy (IR)',
  },
  tlc: {
    label: 'thin-layer chromatography (TLC)',
    termId: 'CHMO:0001007',
    value: 'CHMO:0001007 | thin-layer chromatography (TLC)',
  },
  crystal_structure: {
    label: 'X-ray diffraction (XRD)',
    termId: 'CHMO:0000156',
    value: 'CHMO:0000156 | X-ray diffraction (XRD)',
  },
  others: {
    label: 'process',
    termId: 'BFO:0000015',
    value: 'BFO:0000015 | process',
  }
};
