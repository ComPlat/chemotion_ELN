import React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Dropdown, DropdownButton, Button
} from 'react-bootstrap';
import { FormattedMessage, injectIntl } from 'react-intl';
import Tree from 'antd/lib/tree';
import Dropzone from 'react-dropzone';

import UsersFetcher from 'src/fetchers/UsersFetcher';
import AdminFetcher from 'src/fetchers/AdminFetcher';
import { difference } from 'lodash';

class OlsTerms extends React.Component {
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

  handleSelectName(olsName) {
    this.setState({
      selectName: olsName,
      enableIds: [],
      disableIds: []
    });
    this.initialOls(olsName);
  }

  handleSaveBtn() {
    const { enableIds, disableIds, selectName } = this.state;
    const { intl } = this.props;
    AdminFetcher.olsTermDisableEnable({ owl_name: selectName, enableIds, disableIds })
      .then((result) => {
        if (result === true) {
          // eslint-disable-next-line no-alert
          alert(intl.formatMessage({ id: 'ols_terms-updated_successfully' }));
          this.setState({ enableIds: [], disableIds: [] });
          this.initialOls(selectName);
        } else {
          // eslint-disable-next-line no-alert
          alert(intl.formatMessage({ id: 'ols_terms-update_error' }));
        }
      });
  }

  handleAssociateBtn() {
    this.setState((prevState) => ({
      checkStrictly: !prevState.checkStrictly
    }));
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

  dropzoneOrfilePreview() {
    const { file } = this.state;
    return file ? (
      <div>
        {file.name}
        <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
          <i className="fa fa-trash-o" />
        </Button>
      </div>
    ) : (
      <Dropzone
        onDrop={(attach) => this.handleFileDrop(attach)}
        className="d-flex align-items-center justify-content-center dnd-zone"
      >
        <div className="text-lighten2 fs-4">
          <FormattedMessage id="ols_terms-drop_file" />
        </div>
      </Dropzone>
    );
  }

  render() {
    const { intl } = this.props;
    const {
      selectName, checkStrictly, expandedKeys, autoExpandParent, checkedKeys, list, enableIds, disableIds
    } = this.state;
    const dropdownTitle = selectName === ''
      ? intl.formatMessage({ id: 'ols_terms-title' })
      : selectName;

    return (
      <>
        {this.dropzoneOrfilePreview()}
        <Button variant="warning" size="md" className="mt-3" onClick={() => this.handleClick()}>
          <FormattedMessage id="ols_terms-import_btn" />
        </Button>
        <Row className="mt-4">
          <Col md={6}>
            <DropdownButton variant="light" className="mb-3" id="dropdown-basic-button" title={dropdownTitle}>
              <Dropdown.Item key="rxno" onClick={() => this.handleSelectName('rxno')}>rxno</Dropdown.Item>
              <Dropdown.Item key="chmo" onClick={() => this.handleSelectName('chmo')}>chmo</Dropdown.Item>
            </DropdownButton>
            <h3>{selectName}</h3>
            <Button
              variant="primary"
              onClick={() => this.handleSaveBtn()}
              className="me-3"
            >
              <FormattedMessage id="save" />
            </Button>
            <Button
              variant="primary"
              onClick={() => this.handleAssociateBtn()}
              className="me-3"
            >
              <FormattedMessage id="ols_terms-switch_mode" />
            </Button>
            <div className="fs-5 fw-bold d-inline-block">
              <FormattedMessage
                id={checkStrictly === true ? 'ols_terms-check_strictly' : 'ols_terms-associated'}
              />
            </div>

            <Tree
              name={selectName}
              checkable
              onExpand={this.onExpand}
              expandedKeys={expandedKeys}
              autoExpandParent={autoExpandParent}
              onCheck={this.onCheck}
              checkedKeys={checkedKeys}
              checkStrictly={checkStrictly}
              treeData={list}
            />
          </Col>
          <Col md={6}>
            <div className="white-space-pre">
              <h3><FormattedMessage id="ols_terms-enable_list" /></h3>
              {enableIds.join('\n')}
              <h3><FormattedMessage id="ols_terms-disable_list" /></h3>
              {disableIds.join('\n')}
            </div>
          </Col>
        </Row>
      </>
    );
  }
}

OlsTerms.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(OlsTerms);
