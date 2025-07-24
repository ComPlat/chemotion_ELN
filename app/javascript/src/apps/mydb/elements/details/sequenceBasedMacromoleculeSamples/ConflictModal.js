import React, { useState, useContext } from 'react';
import { Alert, Button, Modal, Table } from 'react-bootstrap';
import Draggable from "react-draggable";

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ConflictModal = () => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const sbmmSample = sbmmStore.sequence_based_macromolecule_sample;

  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  }

  const spinner = (
    <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
  );

  const booleanValueOrText = (key, value) => {
    let newValue = value;

    if (key == 'parent') {
      newValue = value?.id;
    }

    if (key == 'sequence') {
      newValue = value.match(/.{1,10}/g).join(' ')
    }

    if (value === true) {
      newValue = 'Yes';
    } else if (value === false) {
      newValue = 'No';
    }
    return newValue;
  }

  const rowsForModifications = (key, rows) => {
    if (!sbmmStore.conflictSbmms[0][key]) { return rows; }

    const headline =
      key == 'protein_sequence_modifications' ? 'Sequence modifications' : 'Posttranslational modifications';
    const cleanedKeys =
      (({ id, deleted_at, created_at, updated_at, ...o }) => o)(sbmmStore.conflictSbmms[0][key]);

    rows.push(
      <tr>
        <td colspan="34"><h5>{headline}</h5></td>
      </tr>
    );
    Object.keys(cleanedKeys).map((modificationKey) => {
      rows.push(
        <tr>
          <td>{modificationKey}</td>
          <td className="text-wrap">{booleanValueOrText(key, sbmmStore.conflictSbmms[0][key][modificationKey])}</td>
          <td className="text-wrap">{booleanValueOrText(key, sbmmStore.conflictSbmms[1][key][modificationKey])}</td>
        </tr>
      );
    });
    return rows;
  }

  const rowOfSbmmKeys = () => {
    let rows = [];
    const cleanedKeys =
      (({ id, uniprot_source, splitted_sequence, attachments, created_at, updated_at, ...o }) => o)(sbmmStore.conflictSbmms[0]);

    Object.keys(cleanedKeys).map((key) => {
      if (key == 'protein_sequence_modifications' || key == 'post_translational_modifications') {
        rows = rowsForModifications(key, rows);
      } else {
        rows.push(
          <tr>
            <td>{key}</td>
            <td className="text-wrap">{booleanValueOrText(key, sbmmStore.conflictSbmms[0][key])}</td>
            <td className="text-wrap">{booleanValueOrText(key, sbmmStore.conflictSbmms[1][key])}</td>
          </tr>
        );
      }
    })
    return rows;
  }

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show={true}
          onHide={() => sbmmStore.closeConflictModal()}
          backdrop={false}
          keyboard={false}
          className="draggable-modal-dialog-xxxl"
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName="draggable-modal-content"
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >
          <Modal.Header className="ps-0 border-bottom border-gray-600 bg-gray-300" closeButton>
            <Modal.Title className="draggable-modal-stack-title">
              <i className="fa fa-arrows move" />
              SBMM Conflict Options
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ height: "calc(100% - 70vh - 120px)" }}>
            <Alert variant="danger">
              {
                sbmmSample.errors.conflict.message
              }
            </Alert>
            {sbmmStore.conflictSbmms.length < 1 && (<div>{spinner}</div>)}

            {sbmmStore.conflictSbmms.length >= 1 && (
              <>
                <div className="overflow-auto" style={{ height: "calc(100% - 160px)" }}>
                  <Table className="mw-100 p-3" bordered hover striped>
                    <tbody>
                      <tr>
                        <td className="w-25">&nbsp;</td>
                        <td className="w-25 fs-6 fw-bold p-3">Your new SBMM</td>
                        <td className="w-25 fs-6 fw-bold p-3">Existing SBMM {sbmmStore.conflictSbmms[1].id}</td>
                      </tr>
                      {rowOfSbmmKeys()}
                    </tbody>
                  </Table>
                </div>
                <Table>
                  <tr>
                    <td className="w-25">&nbsp;</td>
                    <td className="w-25">
                      <div className="d-flex align-content-between flex-wrap" style={{ height: "100px" }}>
                        <span>
                          If the existing SBMM and its samples should be changed, please contact your system admin.
                          Your Sample will be saved with the existing SBMM.
                        </span>
                        
                        <Button variant="warning" className="mt-2">Contact your system admin</Button>
                      </div>
                    </td>
                    <td className="w-25">
                      <div className="d-flex align-content-between flex-wrap" style={{ height: "100px" }}>
                        <span>Discard changes of your new SBMM and use existing SBMM to save this sample.</span>

                        <Button variant="warning" className="mt-2">Use this SBMM</Button>
                      </div>
                    </td>
                  </tr>
                </Table>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => sbmmStore.closeConflictModal()}>Cancel</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Draggable>
  );
}

export default observer(ConflictModal);