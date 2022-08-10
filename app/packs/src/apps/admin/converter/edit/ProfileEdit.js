/* eslint-disable react/no-array-index-key */
/* eslint-disable react/prop-types */
import React from "react"
import { Button, Popover, ButtonGroup, OverlayTrigger, Panel, Row, Col } from 'react-bootstrap';

import FirstRowIsHeaderInput from 'src/apps/admin/converter/edit/FirstRowIsHeaderInput';
import HeaderForm from 'src/apps/admin/converter/edit/HeaderForm';
import TableForm from 'src/apps/admin/converter/edit/TableForm';
import IdentifierForm from 'src/apps/admin/converter/edit/IdentifierForm';
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

const ProfileEdit = (props) => {
  const {
    id, title, description, updateTitle, updateDescription, addTable, updateTable, removeTable,
    addHeader, updateHeader, removeHeader, addOperation, updateOperation, removeOperation,
    updateProfile, backProfileList
  } = props;

  return (
    <div>
      <Panel>
        <Panel.Heading>
          <div>Profile</div>
        </Panel.Heading>
        <Panel.Body>
          <div className="mt-3">
            <label>Title</label>
            <input type="text" className="form-control form-control-sm" onChange={event => updateTitle(event.currentTarget.value)} value={title} />
            <small className="text-muted">Please add a title for this profile.</small>
          </div>
          <div className="mt-3">
            <label>Description</label>
            <textarea className="form-control" rows="3" onChange={event => updateDescription(event.currentTarget.value)} value={description} />
            <small className="text-muted">Please add a description for this profile.</small>
          </div>
          <div className="mt-3">
            <label>Unique ID</label>
            <div><code>{id}</code></div>
            <small className="text-muted">The unique id for this profile.</small>
          </div>
        </Panel.Body>
      </Panel>

      {
        props.tables && props.tables.map((table, index) => (
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
                  header={table.header}
                  addHeader={() => addHeader(index)}
                  updateHeader={(key, value, oldKey) => updateHeader(index, key, value, oldKey)}
                  removeHeader={key => removeHeader(index, key)}
                />
                <TableForm
                  table={table.table}
                  updateTable={(key, value) => updateTable(index, key, value)}
                  addOperation={(key, type) => addOperation(index, key, type)}
                  updateOperation={(key, opIndex, opKey, value) => updateOperation(index, key, opIndex, opKey, value)}
                  removeOperation={(key, opIndex) => removeOperation(index, key, opIndex)}
                />
              </Panel.Body>
            </Panel>
          </React.Fragment>
        ))
      }

      <div style={{ margin: '10px' }}>
        <Button bsStyle="warning" bsSize="small" onClick={addTable}>
          Add table&nbsp;<i className="fa fa-plus" aria-hidden="true" />
        </Button>&nbsp;&nbsp;
      </div>

      <Panel>
        <Panel.Heading>
          <div>First row are column names</div>
        </Panel.Heading>
        <Panel.Body>
          {
            props.firstRowIsHeader && props.firstRowIsHeader.map((checked, index) => {
              return (<FirstRowIsHeaderInput
                key={index}
                title={`Table #${index}`}
                checked={checked}
                index={index}
                updateFirstRowIsHeader={props.updateFirstRowIsHeader}
              />);
            })
          }
        </Panel.Body>
      </Panel>

      <Panel>
        <Panel.Heading>
          <div>Identifiers</div>
        </Panel.Heading>
        <Panel.Body>
          <label>Based on metadata</label>
          <IdentifierForm
            type="metadata"
            identifiers={props.identifiers}
            addIdentifier={props.addIdentifier}
            updateIdentifier={props.updateIdentifier}
            removeIdentifier={props.removeIdentifier}
            data={[]}
          />
          <label>Based on table headers</label>
          <IdentifierForm
            type="table"
            identifiers={props.identifiers}
            addIdentifier={props.addIdentifier}
            updateIdentifier={props.updateIdentifier}
            removeIdentifier={props.removeIdentifier}
            data={[]}
          />
        </Panel.Body>
      </Panel>
      <Row style={{ paddingBottom: '60px' }}>
        <Col sm={12} md={12} lg={12}>
          <Button bsStyle="primary" bsSize="small" onClick={updateProfile}>
            Save profile&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>&nbsp;&nbsp;
          {renderCancelButton(backProfileList)}
        </Col>
      </Row>
    </div>
  );
};

export default ProfileEdit;
