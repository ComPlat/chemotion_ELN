/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';
import { ButtonTooltip } from 'src/apps/admin/generic/Utils';

class IndentifierInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      disabled: true
    };

    this.onSelectMetadata = this.onSelectMetadata.bind(this)
    this.onSelectTable = this.onSelectTable.bind(this)
    this.toogleIsRegex = this.toogleIsRegex.bind(this)
    this.removeIdentifier = this.removeIdentifier.bind(this)
    this.updateLinenumber = this.updateLinenumber.bind(this)
    this.updateValue = this.updateValue.bind(this)
    this.updateHeaderKey = this.updateHeaderKey.bind(this)
  }

  onSelectMetadata(event) {
    const option = event.target.value;
    const value = this.props.options[option];
    const data = {
      metadataKey: option,
      value,
      isRegex: false
    };
    this.props.updateIdentifier(this.props.id, data);
    this.setState({
      disabled: true
    });
  }

  onSelectTable(event) {
    const data = {
      tableIndex: Number(event.target.value)
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  updateLinenumber(event) {
    const lineNumber = event.target.value;
    const data = {
      lineNumber: lineNumber
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  updateHeaderKey(event) {
    const value = event.target.value;
    const data = {
      headerKey: value
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  updateValue(event) {
    const value = event.target.value;
    const data = {
      value: value
    };
    this.props.updateIdentifier(this.props.id, data);
  }

  removeIdentifier() {
    this.props.removeIdentifier(this.props.id)
  }

  toogleIsRegex(event) {
    const data = {};
    const isRegex = !this.props.isRegex;
    data['isRegex'] = isRegex;
    this.props.updateIdentifier(this.props.id, data);
  }

  render() {
    return (
      <Row style={{ marginTop: '10px' }}>
        {this.props.type === 'metadata' &&
          <Col sm={4} md={4} lg={4}>
            <label className="sr-only" htmlFor={"metadataKeySelect" + this.props.id}>Metadata</label>
            <select className="form-control form-control-sm" id={`metadataKeySelect${this.props.id}`} onChange={this.onSelectMetadata}>
              {
                Object.keys(this.props.options).map((option, i) =>
                  <option key={i}>{option}</option>)
              }
            </select>
          </Col>
        }

        {this.props.type === 'table' &&
          <Col sm={2} md={2} lg={2}>
            <label className="sr-only" htmlFor={"tabledataTableSelect" + this.props.id}>Tabledata</label>
            <select className="form-control form-control-sm" id={`abledataTableSelect${this.props.id}`} onChange={this.onSelectTable}>
              {
                Object.keys(this.props.options).map((option, i) =>
                  <option key={i} value={i}>{`Table #${i}`}</option>
                )
              }
            </select>
          </Col>
        }

        {this.props.type === 'table' &&
          <Col sm={2} md={2} lg={2}>
            <label className="sr-only" htmlFor={"tabledataLineSelect" + this.props.id}>Line</label>
            <input
              onChange={this.updateLinenumber}
              type="text"
              placeholder="# line"
              className="form-control form-control-sm"
              id={`tabledataLineSelect${this.props.id}`}
              value={this.props.lineNumber}
            />
          </Col>
        }

        <Col sm={this.props.type === 'metadata' ? 4 : 2}>
          <label className="sr-only" htmlFor={"identifierValue" + this.props.id}>value</label>
          <div className="input-group">
            <input
              onChange={this.updateValue}
              type="text"
              placeholder="Value"
              className="form-control form-control-sm"
              id={`identifierValue${this.props.id}`}
              disabled={this.props.type === 'metadata' && !this.props.isRegex}
              value={this.props.value}
            />
          </div>
        </Col>

        <Col sm={2} md={2} lg={2}>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              name="identifierInterpretOptions"
              id={`isRegex${this.props.id}`}
              value="regex"
              onChange={this.toogleIsRegex}
              checked={this.props.isRegex}
            />
            <label className="form-check-label" htmlFor={"isRegex" + this.props.id}>RegExp</label>
          </div>
        </Col>

        {this.props.type == 'table' &&
          <Col sm={2} md={2} lg={2}>
            <label className="sr-only" htmlFor={"identifierHeaderKey" + this.props.id}>Headerkey</label>
            <div className="input-group">
              <input
                onChange={this.updateHeaderKey}
                type="text"
                placeholder="Header key"
                className="form-control form-control-sm"
                id={`identifierHeaderKey${this.props.id}`}
                value={this.props.headerKey}
              />
            </div>
          </Col>
        }

        <Col sm={2} md={2} lg={2}>
          <ButtonTooltip tip="Remove" size="small" fnClick={this.removeIdentifier} place="bottom" fa="fa-trash-o" />&nbsp;
        </Col>
      </Row>
    );
  }
}

export default IndentifierInput;
