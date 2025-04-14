import React, { useContext } from 'react';
import { Row, Col, Accordion, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import SequenceAndPostTranslationalModificationForm from './SequenceAndPostTranslationalModificationForm';

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

  let fieldPrefix = 'sequence_based_macromolecule';
  if (ident === 'reference' && sbmmSample.sequence_based_macromolecule.parent) {
    fieldPrefix = `${fieldPrefix}.parent`;
    parent = sbmmSample.sequence_based_macromolecule.parent;
  }
  if (ident === 'reference') {
    disabled = true;
  }

  const visibleForModification = isProtein && uniprotDerivationValue === 'uniprot_modified';

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

  const handleCIFFileUpload = (field) => {
    console.log(field);
  }

  const handlePDBFileUpload = (field) => {
    console.log(field);
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

  // <Col className="mb-2">
  //   {
  //     formHelper.checkboxInput(
  //       `${fieldPrefix}.show_structure_details`, 'Show details about structural files', disabled
  //     )
  //   }
  // </Col>
  // {
  //   ident === 'reference' && sbmmSample[fieldPrefix]?.show_structure_details && (
  //     <Row className="mb-4 align-items-end">
  //       <Col>
  //         <label className="form-label">Structure file cif</label>
  //         {formHelper.dropzone(`${fieldPrefix}.structure_file_cif`, handleCIFFileUpload)}
  //       </Col>
  //       <Col>
  //         <label className="form-label">Structure file pdb</label>
  //         {formHelper.dropzone(`${fieldPrefix}.structure_file_pdb`, handlePDBFileUpload)}
  //       </Col>
  //     </Row>
  //   )
  // }
  // {
  //   ident === 'sequence_modifications'
  //   && sbmmSample[fieldPrefix]?.show_structure_details && (
  //     <Row className="mb-4 align-items-end">
  //       <Col>
  //         <label className="form-label">Structure file cif</label>
  //         {formHelper.dropzone(`${fieldPrefix}.structure_file_cif`, handleCIFFileUpload)}
  //       </Col>
  //       <Col>
  //         <label className="form-label">Structure file pdb</label>
  //         {formHelper.dropzone(`${fieldPrefix}.structure_file_pdb`, handlePDBFileUpload)}
  //       </Col>
  //     </Row>
  //   )
  // }

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
