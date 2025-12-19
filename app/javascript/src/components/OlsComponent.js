import React, { Component } from 'react';
import TreeSelect from 'antd/lib/tree-select';
import PropTypes from 'prop-types';
import UserStore from 'src/stores/alt/stores/UserStore';

const filterTreeNode = (input, child) => String(child.props.search && child.props.search.toLowerCase())
  .indexOf(input && input.toLowerCase()) !== -1;
export default class OlsTreeSelect extends Component {
  constructor(props) {
    super(props);
    this.OnSelectChange = this.OnSelectChange.bind(this);
  }

  OnSelectChange(e) {
    const cleanedOlsEntry = this.removeArtificalId(e || '');
    this.props.onSelectChange(
      cleanedOlsEntry,
      this.props.selectName
    );
  }

  removeArtificalId(value) {
    const uuidCheckRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
    const parts = value.split('$');
    if (parts.length === 1) { return value.trim(); }

    if (!uuidCheckRegex.test(parts.slice(-1))) { return value.trim(); }

    return parts
      .slice(0, -1)
      .join('$')
      .trim();
  }

  combineChmoAndBao(chmos, bao) {
    const chmoArray = chmos || [];
    const baoArray = bao || [];

    // Find "Recently selected" nodes in both arrays (typically the first element)
    const chmoRecentlySelected = chmoArray.find(
      (node) => node.title === '-- Recently selected --' || node.value === '-- Recently selected --'
    );
    const baoRecentlySelected = baoArray.find(
      (node) => node.title === '-- Recently selected --' || node.value === '-- Recently selected --'
    );

    // Get other nodes (excluding "Recently selected")
    const chmoOtherNodes = chmoArray.filter(
      (node) => node.title !== '-- Recently selected --' && node.value !== '-- Recently selected --'
    );
    const baoOtherNodes = baoArray.filter(
      (node) => node.title !== '-- Recently selected --' && node.value !== '-- Recently selected --'
    );

    // Merge "Recently selected" children if both exist
    let mergedRecentlySelected = null;
    if (chmoRecentlySelected || baoRecentlySelected) {
      const chmoChildren = chmoRecentlySelected?.children || [];
      const baoChildren = baoRecentlySelected?.children || [];
      const mergedChildren = [...chmoChildren, ...baoChildren];

      mergedRecentlySelected = {
        ...(chmoRecentlySelected || baoRecentlySelected),
        children: mergedChildren
      };
    }

    // Combine: merged "Recently selected" first, then other nodes from both ontologies
    const combined = [];
    if (mergedRecentlySelected) {
      combined.push(mergedRecentlySelected);
    }
    combined.push(...chmoOtherNodes, ...baoOtherNodes);

    return combined;
  }

  render() {
    const { rxnos, chmos, bao } = UserStore.getState();
    let treeData = [];
    const height = this.props.selectName === 'rxno' ? '35px' : null;
    switch (this.props.selectName) {
      case 'rxno':
        treeData = rxnos;
        break;
      case 'chmo':
        // Combine CHMO and BAO ontology terms, merging "Recently selected" sections
        treeData = this.combineChmoAndBao(chmos, bao);
        break;
      case 'bao':
        treeData = bao;
        break;
      default:
        break;
    }

    // Expand both CHMO and BAO when selectName is 'chmo'
    const expandedKeys = this.props.selectName === 'chmo'
      ? ['chmo', 'bao']
      : [this.props.selectName];

    return (
      <TreeSelect
        treeDefaultExpandedKeys={expandedKeys}
        name={this.props.selectName}
        showSearch
        className='w-100'
        style={{height}}
        value={this.props.selectedValue}
        treeData={treeData}
        placeholder="Select..."
        allowClear
        onChange={(e) => this.OnSelectChange(e)}
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
