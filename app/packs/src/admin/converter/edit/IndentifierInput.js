/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';
import { ButtonTooltip } from '../../../admin/generic/Utils';

class IndentifierInput extends Component {
  constructor(props) {
    super(props);

    this.removeIdentifier = this.removeIdentifier.bind(this)
    this.updateValue = this.updateValue.bind(this)
    this.toogleIsRegex = this.toogleIsRegex.bind(this)
    this.updateLinenumber = this.updateLinenumber.bind(this)
    this.updateHeaderKey = this.updateHeaderKey.bind(this)
    this.updateMetadataKey = this.updateMetadataKey.bind(this)
    this.updateTableIndex = this.updateTableIndex.bind(this)
  }

  updateValue(event) {
    const { value } = event.target;
    const data = {
      value
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  updateLinenumber(event) {
    const lineNumber = event.target.value;
    const data = {
      lineNumber
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  toogleIsRegex(event) {
    const data = {};
    const isRegex = !this.props.isRegex;
    data['isRegex'] = isRegex;
    this.props.updateIdentifier(this.props.id, data);
  }

  removeIdentifier() {
    this.props.removeIdentifier(this.props.id);
  }

  updateHeaderKey(event) {
    const { value } = event.target;
    const data = {
      headerKey: value
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  updateMetadataKey(event) {
    const { value } = event.target;
    const data = {
      metadataKey: value
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  updateTableIndex(event) {
    const { value } = event.target;
    const data = {
      tableIndex: value
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  render() {
    return (
      <div>
        {this.props.type === 'metadata' &&
          <Row style={{ marginTop: '10px' }}>
            <Col sm={4} md={4} lg={4}>
              <input
                onChange={this.updateMetadataKey}
                className="form-control form-control-sm"
                value={this.props.metadataKey}
              />
              <label className="mb-0"><small>Key</small></label>
            </Col>
            <Col sm={4} md={4} lg={4}>
              <input
                type="text"
                onChange={this.updateValue}
                className="form-control form-control-sm"
                value={this.props.value}
              />
              <label className="mb-0"><small>Value</small></label>
            </Col>
            <Col sm={2} md={2} lg={2}>
              <div className="form-check">
                <input className="form-check-input"
                  type="checkbox" name="identifierInterpretOptions"
                  id={"isRegex" + this.props.id}
                  value="regex"
                  onChange={this.toogleIsRegex} checked={this.props.isRegex}
                />
                <label className="form-check-label" htmlFor={"isRegex" + this.props.id}>RegExp</label>
              </div>
            </Col>
            <Col sm={2} md={2} lg={2}>
              <span className="button-right" >
                <ButtonTooltip tip="Remove" fnClick={this.removeIdentifier} place="bottom" fa="fa-trash-o" />&nbsp;
              </span>
            </Col>
          </Row>
        }

        {this.props.type === 'table' &&
          <Row style={{ marginTop: '10px' }}>
            <Col sm={2} md={2} lg={2}>
              <input
                onChange={this.updateTableIndex}
                className="form-control form-control-sm"
                value={this.props.tableIndex}
              />
              <label className="mb-0"><small>Table Index</small></label>
            </Col>

            <Col sm={2} md={2} lg={2}>
              <input
                onChange={this.updateLinenumber}
                type="text"
                placeholder="Line number"
                className="form-control form-control-sm"
                value={this.props.lineNumber}
              />
              <label className="mb-0"><small>Line number</small></label>
            </Col>

            <Col sm={2} md={2} lg={2}>
              <input
                onChange={this.updateValue}
                type="text"
                placeholder="Value"
                className="form-control form-control-sm"
                disabled={this.props.type === 'metadata' && !this.props.isRegex}
                value={this.props.value}
              />
              <label className="mb-0"><small>Value</small></label>
            </Col>

            <Col sm={2} md={2} lg={2}>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="identifierInterpretOptions"
                  id={`isRegex${this.props.id}`}
                  value="RegExp"
                  onChange={this.toogleIsRegex}
                  checked={this.props.isRegex}
                />
                <label className="form-check-label" htmlFor={"isRegex" + this.props.id}>RegExp</label>
              </div>
            </Col>

            <Col sm={2} md={2} lg={2}>
              <input
                onChange={this.updateHeaderKey}
                type="text"
                placeholder="Header key"
                className="form-control form-control-sm"
                value={this.props.headerKey}
              />
              <label className="mb-0"><small>Header key</small></label>
            </Col>

            <Col sm={2} md={2} lg={2}>
              <span className="button-right" >
                <ButtonTooltip tip="Remove" fnClick={this.removeIdentifier} place="bottom" fa="fa-trash-o" />&nbsp;
              </span>
            </Col>
          </Row>
        }
      </div>
    );
  }
}

export default IndentifierInput;
