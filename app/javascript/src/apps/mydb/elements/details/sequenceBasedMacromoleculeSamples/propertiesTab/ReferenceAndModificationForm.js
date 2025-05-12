import React, { useContext } from 'react';
import { Row, Col, Accordion, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import SequenceAndPostTranslationalModificationForm from './SequenceAndPostTranslationalModificationForm';
import Attachment from 'src/models/Attachment';

import { undoButton, removeButton, customDropzone, formatFileSize, } from 'src/apps/mydb/elements/list/AttachmentList';
import MolViewerBtn from 'src/components/viewer/MolViewerBtn';
import { formatDate } from 'src/utilities/timezoneHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ReferenceAndModificationForm = ({ ident }) => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  let sbmmSample = sbmmStore.sequence_based_macromolecule_sample;
  const formHelper = initFormHelper(sbmmSample, sbmmStore);

  const isProtein = sbmmSample.sequence_based_macromolecule.sbmm_type === 'protein';
  const uniprotDerivationValue = sbmmSample.sequence_based_macromolecule.uniprot_derivation;
  let parent = sbmmSample.sequence_based_macromolecule;
  let disabled = false;
  const accordionIdent = `${sbmmSample.id}-${ident}`;
  const referenceErrorIdent = `${sbmmSample.id}-reference`;
  const structureFileErrorIdent = `${sbmmSample.id}-structure`;

  let fieldPrefix = 'sequence_based_macromolecule';
  if (ident === 'reference' && sbmmSample.sequence_based_macromolecule.parent) {
    fieldPrefix = `${fieldPrefix}.parent`;
    parent = sbmmSample.sequence_based_macromolecule.parent;
  }
  if (ident === 'reference') {
    disabled = true;
  }

  const visibleForModification = isProtein && uniprotDerivationValue === 'uniprot_modified';
  const visibleForUniprot = isProtein && uniprotDerivationValue === 'uniprot';
  const showAttachments = ((visibleForModification && ident === 'sequence_modifications') || visibleForUniprot);
  const sbmmAttachments = (showAttachments
    ? sbmmSample.sequence_based_macromolecule?.attachments
    : sbmmSample.sequence_based_macromolecule.parent?.attachments)
    || [];
  const sbmmAttachmentDropzoneCols = sbmmAttachments.length >= 1 ? 2 : 12;
  const sbmmAttachmentListCols = showAttachments ? 10 : 12;

  const showIfReferenceSelected = isProtein && !sbmmStore.error_messages[referenceErrorIdent]
    && (parent?.primary_accession || parent?.id || ident === 'sequence_modifications');

  const sequenceLengthValue = parent?.sequence_length || (parent && parent?.sequence && parent?.sequence.length) || ''

  const heterologousExpression = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Unknown', value: 'unknown' },
  ]

  const referenceAccordionHeader = () => {
    if (ident === 'sequence_modifications') {
      return " Properties of the modified sequence or own protein";
    } else if (uniprotDerivationValue === 'uniprot') {
      return "Protein Identifiers and structural characteristics";
    } else if (uniprotDerivationValue === 'uniprot_modified') {
      return "Protein Identifiers and structural characteristics of reference entries"
    }
  }

  const handleStructureFileUpload = (files) => {
    let errorMessages = { ...sbmmStore.error_messages };
    delete errorMessages[structureFileErrorIdent];
    errorMessages[structureFileErrorIdent] = [];

    const newAttachments = [];
    files.map((file) => {
      const isValid = ['cif', 'mmcif', 'pdb'].includes(
        file.name?.match(/\.([^.]+)$/)?.[1]?.toLowerCase()
      );

      if (!isValid) {
        errorMessages[structureFileErrorIdent].push(file.name);
      } else {
        newAttachments.push(Attachment.fromFile(file));
      }
    });

    if (errorMessages[structureFileErrorIdent]) {
      sbmmStore.setErrorMessages(errorMessages);
    }

    if (newAttachments) {
      const updatedAttachments = sbmmSample.sequence_based_macromolecule.attachments.concat(newAttachments);
      sbmmStore.changeSequenceBasedMacromoleculeSample('sequence_based_macromolecule.attachments', updatedAttachments);
    }
  }

  const onUndoDelete = (attachment) => {
    const index = sbmmSample.sequence_based_macromolecule.attachments.indexOf(attachment);
    sbmmStore.changeSBMMAttachment(index, 'is_deleted', false);
  }

  const onDelete = (attachment) => {
    const index = sbmmSample.sequence_based_macromolecule.attachments.indexOf(attachment);
    sbmmStore.changeSBMMAttachment(index, 'is_deleted', true);
  }

  const structureAttachmentError = () => {
    if (!showAttachments || sbmmStore.error_messages[structureFileErrorIdent] === undefined
      || sbmmStore.error_messages[structureFileErrorIdent].length <= 0) {
      return null;
    }

    return (
      <div className="text-danger mb-2">
        {`This file(s) `}
        <b>"{sbmmStore.error_messages[structureFileErrorIdent].join(', ')}"</b>
        {` does not have the correct file format. Only cif and pdf files are saved.`}
      </div>
    )
  }

  const dropzoneForModificationOrUniprot = () => {
    if (!showAttachments) { return null; }
    return (
      <Col className={`col-${sbmmAttachmentDropzoneCols}`}>
        {customDropzone(handleStructureFileUpload)}
      </Col>
    );
  }

  const listSBMMAttachments = () => {
    let attachmentList = [];
    sbmmAttachments.map((attachment) => {
      const rowTextClass = attachment.is_deleted ? ' text-decoration-line-through' : '';
      let deleteButton = '';
      if (showAttachments) {
        deleteButton =
          attachment.is_deleted ? undoButton(attachment, onUndoDelete) : removeButton(attachment, onDelete, false)
      }

      attachmentList.push(
        <div className="attachment-row" key={attachment.id}>
          <div className={`attachment-row-text ms-0 ${rowTextClass}`} title={attachment.filename}>
            {attachment.filename}
            <div className="attachment-row-subtext">
              <div>
                Created:
                <span className="ms-1">{formatDate(attachment.created_at)}</span>
              </div>
              <span className="ms-2 me-2">|</span>
              <div>
                Size:
                <span className="fw-bold text-gray-700 ms-1">
                  {formatFileSize(attachment.filesize)}
                </span>
              </div>
            </div>
          </div>
          <div className="attachment-row-actions d-flex justify-content-end align-items-center gap-2">
            <MolViewerBtn
              disabled={attachment?.isNew || attachment?.is_deleted || false}
              fileContent={`${window.location.origin}/api/v1/attachments/${attachment.id}`}
              isPublic={false}
              viewType={`file_${attachment.id}`}
              key={`attachment_${attachment.id}`}
            />
            {deleteButton}
          </div>
        </div>
      );
    });
    return (<Col className={`col-${sbmmAttachmentListCols}`}>{attachmentList}</Col>);
  }

  const handleDrop = (item) => {
    const result = item.element;
    let errorMessages = { ...sbmmStore.error_messages };
    delete errorMessages[referenceErrorIdent];

    if (uniprotDerivationValue === 'uniprot' && result.uniprot_derivation !== 'uniprot') {
      errorMessages[referenceErrorIdent] = true;
    } else {
      sbmmStore.setSbmmByResult(result);
    }
    sbmmStore.setErrorMessages(errorMessages);
  }

  return (
    <Accordion
      className="mb-4"
      activeKey={sbmmStore.toggable_contents[accordionIdent] && accordionIdent}
      onSelect={() => sbmmStore.toggleContent(accordionIdent)}
    >
      <Accordion.Item eventKey={accordionIdent}>
        <Accordion.Header>
          {referenceAccordionHeader()}
        </Accordion.Header>
        <Accordion.Body>
          <h5 className="mb-3">Identifiers and sequence characteristics:</h5>
          {
            ident === 'reference' && (
              <Row className="mb-4">
                <Col>
                  <label className="form-label">Reference</label>
                  {
                    formHelper.dropAreaForElement(
                      'SEQUENCE_BASED_MACROMOLECULE', handleDrop, 'Drop sequence based macromolecule here'
                    )
                  }
                  {
                    sbmmStore.error_messages[referenceErrorIdent] && (
                      <div className="text-danger mt-2">
                        The sequence based macromolecule has not the right type. Only uniprot is allowed.
                      </div>
                    )
                  }
                </Col>
              </Row>
            )
          }
          {
            showIfReferenceSelected && (
              <>
                <Row className="mb-4 align-items-end">
                  {ident === 'reference' && (
                    <Col>{formHelper.textInput(`${fieldPrefix}.primary_accession`, 'UniProt number', disabled, '')}</Col>
                  )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}.other_identifier`, 'Other reference ID', disabled, '')}</Col>
                  {
                    ident === 'sequence_modifications' && (
                      <Col>{formHelper.textInput(`${fieldPrefix}.own_identifier`, 'Own ID', disabled, '')}</Col>
                    )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}.short_name`, 'Short name', disabled, '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {
                      formHelper.readonlyInput(
                        `${fieldPrefix}.sequence_length`, 'Sequence length', sequenceLengthValue, ''
                      )
                    }
                  </Col>
                  <Col>
                    {formHelper.unitInput(
                      `${fieldPrefix}.molecular_weight`, 'Sequence mass (Da = g/mol)', 'molecular_weight', disabled, ''
                    )}
                  </Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.textInput(`${fieldPrefix}.full_name`, 'Full name', disabled, '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  {
                    visibleForModification && (
                      <Col>{formHelper.textInput(`${fieldPrefix}.pdb_doi`, 'Pdb DOI', disabled, '')}</Col>
                    )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}.ec_numbers`, 'EC number', disabled, '')}</Col>
                </Row>
                <Row className="mb-4">
                  <Col>
                    {formHelper.textareaInput(`${fieldPrefix}.sequence`, 'Sequence of the structure', 3, disabled, '')}
                  </Col>
                </Row>
                {
                  ident === 'reference' && (
                    <Row className="mb-4 align-items-end">
                      <Col>{formHelper.textInput(`${fieldPrefix}.link_uniprot`, 'Link UniProt', disabled, '')}</Col>
                      <Col>{formHelper.textInput(`${fieldPrefix}.link_pdb`, 'Link pdb', disabled, '')}</Col>
                    </Row>
                  )
                }
                {
                  (showAttachments || sbmmAttachments.length >= 1) && (
                    <>
                      <Row>
                        <Col>
                          <label className="form-label">Structure files (cif / pdb)</label>
                          {structureAttachmentError()}
                        </Col>
                      </Row>
                      <Row className="mb-4 align-items-start">
                        {dropzoneForModificationOrUniprot()}
                        {listSBMMAttachments()}
                      </Row>
                    </>
                  )
                }

                <h5 className="mb-3">Details on Protein's source:</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput(
                      `${fieldPrefix}.heterologous_expression`, 'Heterologous expression',
                      heterologousExpression, disabled, '', ''
                    )}
                  </Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.organism`, 'Organism', disabled, '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.taxon_id`, 'Taxon ID', disabled, '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.textInput(`${fieldPrefix}.strain`, 'Strain', disabled, '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.tissue`, 'Tissue', disabled, '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.localisation`, 'Localisation', disabled, '')}</Col>
                </Row>
              </>
            )
          }
          
          {
            ident === 'sequence_modifications' && (
              <SequenceAndPostTranslationalModificationForm key="sequence-and-post-translational-modification" />
            )
          }
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(ReferenceAndModificationForm);
