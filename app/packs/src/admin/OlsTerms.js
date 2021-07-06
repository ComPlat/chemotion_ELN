import React from 'react';
import { Row, Col, DropdownButton, MenuItem } from 'react-bootstrap';
import TreeSelect from 'antd/lib/tree-select';
import Tree from 'antd/lib/tree';
import { ButtonToolbar, Button } from 'react-bootstrap';
import Dropzone from 'react-dropzone';

import UsersFetcher from '../components/fetchers/UsersFetcher';
import AdminFetcher from '../components/fetchers/AdminFetcher';
import CollapsePanel from 'antd/lib/collapse/CollapsePanel';
import { difference } from 'lodash';

const checkItem = (enableIds, disableIds, enable, idkey, checkStrictly) => {
  if (enable === true) {
    if (!enableIds.includes(idkey)) {
      enableIds.push(idkey);
    }
    if (disableIds.includes(idkey)) {
      disableIds = disableIds.filter(r => r !== idkey);
    }
  } else {
    if (enableIds.includes(idkey)) {
      enableIds = enableIds.filter(r => r !== idkey);
    }
    if (!disableIds.includes(idkey)) {
      disableIds.push(idkey);
    }
  }
  return { enableIds, disableIds };
};


export default class OlsTerms extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      selectName: '',
      expandedKeys: [],
      autoExpandParent: true,
      checkStrictly: true,
      checkedKeys: [],
      orgCheckedKeys: [],
      enableIds: [],
      disableIds: [],
      list: []
    };
    this.initialOls = this.initialOls.bind(this);
    this.onExpand = this.onExpand.bind(this);
    this.onCheck = this.onCheck.bind(this);
    this.handleSaveBtn = this.handleSaveBtn.bind(this);
    this.handleSelectName = this.handleSelectName.bind(this);
    this.handleAssociateBtn = this.handleAssociateBtn.bind(this);
  }

  componentDidMount() {
    // this.initialOls(this.state.selectName);
  }

  handleFileDrop(attach) {
    this.setState({ file: attach[0] });
  }

  handleAttachmentRemove() {
    this.setState({ file: null });
  }

  handleClick() {
    const { file } = this.state;
    AdminFetcher.importOlsTerms(file);
  }

  dropzoneOrfilePreview() {
    const { file } = this.state;
    return file ? (
      <div>
        {file.name}
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
          <i className="fa fa-trash-o" />
        </Button>
      </div>
    ) : (
      <Dropzone
        onDrop={attach => this.handleFileDrop(attach)}
        style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
          Drop File, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  addToChecked(cks, parent) {
    if (parent.is_enabled === true) { cks.push(parent.value); }
    (parent.children || []).map((node) => {
      node.key = node.value;
      this.addToChecked(cks, node);
    });
    return cks;
  }

  initialOls(selectName) {
    let checkedKeys = [];
    if (selectName == null && selectName === '') { return; }
    UsersFetcher.fetchOls(selectName, false)
      .then((result) => {
        (result.ols_terms || []).map((a) => {
          a.key = a.value;
          checkedKeys = this.addToChecked(checkedKeys, a);
        });
        this.setState({
          expandedKeys: checkedKeys,
          orgCheckedKeys: checkedKeys,
          list: result.ols_terms,
          checkedKeys,
        });
      });
  }

  onExpand(expandedKeys) {
    this.setState({
      expandedKeys,
      autoExpandParent: false,
    });
  }

  onCheck(checkedKeys, e) {
    const { checkStrictly, orgCheckedKeys } = this.state;
    const checkedObj = (checkStrictly === true) ? checkedKeys.checked : checkedKeys;
    const disableIds = difference(orgCheckedKeys, checkedObj);
    const enableIds = difference(checkedObj, orgCheckedKeys);

    this.setState({ checkedKeys, enableIds, disableIds });
  }

  handleSelectName(olsName) {
    this.setState({
      selectName: olsName,
      enableIds: [],
      disableIds: []
    });
    this.initialOls(olsName);
  }


  handleSaveBtn() {
    const { enableIds, disableIds } = this.state;
    AdminFetcher.olsTermDisableEnable({ owl_name: this.state.selectName, enableIds, disableIds })
      .then((result) => {
        if (result === true) {
          alert('update successfully!');
          this.setState({ enableIds: [], disableIds: [] });
          this.initialOls(this.state.selectName);
        } else {
          alert('update error, please check system log!');
        }
      });
  }

  handleAssociateBtn() {
    this.setState({ checkStrictly: !this.state.checkStrictly });
  }

  render() {
    return (
      <React.Fragment>
        <Row style={{ maxWidth: '2000px', maxHeight: '1000px', margin: 'auto' }}>
          {this.dropzoneOrfilePreview()}
          <ButtonToolbar>
            <Button bsStyle="warning" onClick={() => this.handleClick()}>Import OLS Terms (the file name will be the OLS_name)</Button>
          </ButtonToolbar>
        </Row>
        <Row style={{ maxWidth: '2000px', maxHeight: '1000px', margin: 'auto' }}>
          <Col md={6}>
            <DropdownButton title={this.state.selectName === '' ? 'Ols Terms' : this.state.selectName}>
              <MenuItem key="rxno" onSelect={() => this.handleSelectName('rxno')}>
                rxno
              </MenuItem>
              <MenuItem key="chmo" onSelect={() => this.handleSelectName('chmo')}>
                chmo
              </MenuItem>
            </DropdownButton>
            <div><h3>{this.state.selectName}</h3></div>
            <Button
              bsStyle="primary"
              onClick={() => this.handleSaveBtn()}
            >Save
            </Button> &nbsp; &nbsp;
            <Button
              bsStyle="primary"
              onClick={() => this.handleAssociateBtn()}
            >switch mode
            </Button>
            &nbsp;
            {this.state.checkStrictly === true ? 'Check Strickly' : 'Associated'}
            <Tree
              name={this.state.selectName}
              checkable
              onExpand={this.onExpand}
              expandedKeys={this.state.expandedKeys}
              autoExpandParent={this.state.autoExpandParent}
              onCheck={this.onCheck}
              checkedKeys={this.state.checkedKeys}
              checkStrictly={this.state.checkStrictly}
              treeData={this.state.list}
            />
          </Col>
          <Col md={6}>
            <div style={{ whiteSpace: 'pre' }}>
              <h3>enable list</h3>
              {this.state.enableIds.join('\n')}
              <h3>disable list</h3>
              {this.state.disableIds.join('\n')}
            </div>
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}
