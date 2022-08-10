/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Tabs, Tab, Button, Row, Col, Panel, Popover, ButtonGroup, OverlayTrigger } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import HeaderForm from 'src/apps/admin/converter/create/HeaderForm';
import TableForm from 'src/apps/admin/converter/create/TableForm';
import IdentifierForm from 'src/apps/admin/converter/create/IdentifierForm';
import { ButtonTooltip } from 'src/apps/admin/generic/Utils';

const renderCancelButton = (backProfileList) => {
  const popover = (
    <Popover id="popover-positioned-scrolling-left">
      back to profile list? <br />
      <div className="btn-toolbar">
        <Button bsSize="xsmall" bsStyle="danger" onClick={backProfileList}>
          Yes
        </Button><span>&nbsp;&nbsp;</span>
        <Button bsSize="xsmall" bsStyle="warning" >
          No
        </Button>
      </div>
    </Popover>
  );

  return (
    <ButtonGroup className="actions">
      <OverlayTrigger
        animation
        placement="right"
        root
        trigger="focus"
        overlay={popover}
      >
        <Button bsStyle="warning" bsSize="small" >
          Cancel &nbsp;<i className="fa fa-times" />
        </Button>
      </OverlayTrigger>
    </ButtonGroup>
  );
};


const renderTableHeader = table => (
  <div>
    Header
    <pre>
      {
        table.header.map((line, index) => <code key={index}>{line}</code>)
      }
    </pre>
  </div>
);

class ProfileCreate extends Component {
  constructor(props) {
    super(props);
    this.onGridReady = this.onGridReady.bind(this);
  }

  onGridReady(params) {
    this.api = params.api;
  }

  renderDataGrid(table) {
    const columns = table && table.columns && table.columns.map((col) => {
      return (
        { headerName: col.name, field: col.key }
      );
    });

    const rows = table.rows.map(row => Object.fromEntries(row.map((value, idx) => [idx, value])));

    return (
      <div style={{ height: '60vh' }} className="green-metrics ag-theme-balham">
        <AgGridReact
          enableColResize
          columnDefs={columns}
          rowData={rows}
          headerHeight={68}
          onGridReady={this.onGridReady}
        />
      </div>);
  }

  render() {
    const {
      tableData, columnList, headerOptions, title, description, identifiers,
      updateTitle, updateDescription, addTable, updateHeader, updateTable, addOperation,
      updateOperation, removeOperation, removeTable, addIdentifier, updateIdentifier, removeIdentifier,
      toggleFirstRowIsHeader, createProfile, backProfileList
    } = this.props;

    const tabContents = [];
    tableData.data.forEach((e, idx) => {
      tabContents.push(
        <Tab eventKey={idx} title={`Table ${idx}`}>
          Tab # {idx}
          {e.header.length > 0 && renderTableHeader(e)}

          {e.rows.length > 0 &&
            <div>
              <div className="form-group form-check">
                <input
                  type="checkbox"
                  checked={e.firstRowIsHeader || false}
                  onChange={() => toggleFirstRowIsHeader(idx)}
                  className="form-check-input"
                  id="first_row_is_header"
                />
                <label className="form-check-label" htmlFor="first_row_is_header">First row are column names</label>
              </div>

              {this.renderDataGrid(e)}
            </div>
          }
        </Tab>
      );
    });


    return (
      <Row>
        <Col sm={6} md={6} lg={6}>
          <div className="mb-5">
            <h4>Metadata</h4>
            <div className="pt-3 pb-3 mb-3 border-top border-bottom">
              {Object.keys(tableData.metadata).map((entry, index) => {
                return <div key={index}>{entry}: {tableData.metadata[entry]}</div>
              })}
            </div>

            <h4>Tables</h4>
            <Tabs defaultActiveKey={0} id="uncontrolled-tab-example">
              {tabContents}
            </Tabs>
          </div>
        </Col>
        <Col sm={6} md={6} lg={6}>
          <div className="mb-5">

            <Panel>
              <Panel.Heading>
                <div>Profile</div>
              </Panel.Heading>
              <Panel.Body>
                <div>
                  <label>Title</label>
                  <input type="text" className="form-control form-control-sm" onChange={event => updateTitle(event.currentTarget.value)} value={title} />
                  <small className="text-muted">Please add a title for this profile.</small>
                </div>
                <div className="mt-3">
                  <label>Description</label>
                  <textarea className="form-control" rows="3" onChange={event => updateDescription(event.currentTarget.value)} value={description} />
                  <small className="text-muted">Please add a description for this profile.</small>
                </div>
              </Panel.Body>
            </Panel>

            {
              this.props.tables.map((table, index) => {
                return (
                  <React.Fragment key={index}>
                    <Panel>
                      <Panel.Heading>
                        <Row>
                          <Col sm={11} md={11} lg={11}>
                            Table #{index}
                          </Col>
                          <Col sm={1} md={1} lg={1}>
                            <span className="button-right" >
                              <ButtonTooltip tip="Remove" fnClick={removeTable} place="left" fa="fa-trash-o" />&nbsp;
                            </span>
                          </Col>
                        </Row>
                      </Panel.Heading>
                      <Panel.Body>
                        <HeaderForm
                          headerOptions={headerOptions}
                          updateHeader={(key, value) => updateHeader(index, key, value)}
                        />
                        <TableForm
                          table={table.table}
                          columnList={columnList}
                          updateTable={(key, value) => updateTable(index, key, value)}
                          addOperation={(key, type) => addOperation(index, key, type)}
                          updateOperation={(key, opIndex, opKey, value) => updateOperation(index, key, opIndex, opKey, value)}
                          removeOperation={(key, opIndex) => removeOperation(index, key, opIndex)}
                        />
                      </Panel.Body>
                    </Panel>
                  </React.Fragment>
                );
              })
            }

            <div style={{ margin: '10px' }}>
              <Button bsStyle="warning" bsSize="small" onClick={addTable}>
                Add table&nbsp;<i className="fa fa-plus" aria-hidden="true" />
              </Button>&nbsp;&nbsp;
            </div>

            <Panel>
              <Panel.Heading>Identifiers</Panel.Heading>
              <Panel.Body>
                <label>Based on metadata</label>
                <IdentifierForm
                  type="metadata"
                  identifiers={identifiers}
                  addIdentifier={addIdentifier}
                  updateIdentifier={updateIdentifier}
                  removeIdentifier={removeIdentifier}
                  data={tableData.metadata}
                />

                <label>Based on table headers</label>
                <IdentifierForm
                  type="table"
                  identifiers={identifiers}
                  addIdentifier={addIdentifier}
                  updateIdentifier={updateIdentifier}
                  removeIdentifier={removeIdentifier}
                  data={tableData.data}
                />
                <small className="text-muted">The identifiers you create will be used to find the right profile for uploaded files. The 'value' will be compared to the selected file metadata or to the header of a table. If you provide a line number, only this line of the header will be used. If you select 'RexExp', you can enter a regular expression as value, which will be used to match the file. If you fill in the field 'header key', the compared string (or the first group of a given RegExp) will be added to the header of the converted file.</small>
              </Panel.Body>
            </Panel>

            <Row style={{ paddingBottom: '60px' }}>
              <Col sm={12} md={12} lg={12}>
                <Button bsStyle="primary" bsSize="small" onClick={createProfile}>
                  Create profile&nbsp;<i className="fa fa-plus" aria-hidden="true" />
                </Button>&nbsp;&nbsp;
                {renderCancelButton(backProfileList)}
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
    );
  }
}

export default ProfileCreate;
