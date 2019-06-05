import React, { Component } from 'react';
import { TreeSelect } from 'antd';
import PropTypes from 'prop-types';
import _ from 'lodash';
import UserStore from './stores/UserStore';

export default class OlsTreeSelect extends Component {
  constructor(props) {
    super(props);
    this.OnSelectChange = this.OnSelectChange.bind(this);
  }

  OnSelectChange(e) {
    const sel = typeof e === 'undefined' ? '' : e;
    this.props.onSelectChange(sel, this.props.selectName);
  }

  render() {
    const { rxnos, chmos } = UserStore.getState();
    let treeData = [];
    switch (this.props.selectName) {
      case 'rxno':
        treeData = rxnos;
        break;
      case 'chom':
        treeData = chmos;
        break;
      default:
        break;
    }

    return (
      <TreeSelect
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
