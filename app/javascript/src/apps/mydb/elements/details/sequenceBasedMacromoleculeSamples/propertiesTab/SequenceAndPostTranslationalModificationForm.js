import React, { useContext } from 'react';
import { Row, Col } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SequenceAndPostTranslationalModificationForm = () => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  let sbmmSample = sbmmStore.sequence_based_macromolecule_sample;
  const formHelper = initFormHelper(sbmmSample, sbmmStore);
  const disabled = false;

  const fieldPrefixSequence = 'sequence_based_macromolecule.protein_sequence_modifications';
  const fieldPrefixPostTransitional = 'sequence_based_macromolecule.post_translational_modifications';
  const proteinSequenceModification = sbmmSample.sequence_based_macromolecule.protein_sequence_modifications;
  const postTranslationalModifications = sbmmSample.sequence_based_macromolecule.post_translational_modifications;

  const phosphorylationAminoAcids = [
    { label: 'Ser', field: 'phosphorylation_ser_enabled' },
    { label: 'Thr', field: 'phosphorylation_thr_enabled' },
    { label: 'Tyr', field: 'phosphorylation_tyr_enabled' },
  ];

  const glycosylationAminoAcids = [
    { label: 'N-linked Asn', related: 'linkage', only: 'n_linked', field: 'glycosylation_n_linked_asn_enabled' },
    { label: 'O-linked Lys', related: 'linkage', only: 'o_linked', field: 'glycosylation_o_linked_lys_enabled' },
    { label: 'O-linked Ser', related: 'linkage', only: 'o_linked', field: 'glycosylation_o_linked_ser_enabled' },
    { label: 'O-linked Thr', related: 'linkage', only: 'o_linked', field: 'glycosylation_o_linked_thr_enabled' },
  ];

  const hydroxylationAminoAcids = [
    { label: 'Lys', field: 'hydroxylation_lys_enabled' },
    { label: 'Pro', field: 'hydroxylation_pro_enabled' },
  ];

  const methylationAminoAcids = [
    { label: 'Arg', field: 'methylation_arg_enabled' },
    { label: 'Glu', field: 'methylation_glu_enabled' },
    { label: 'Lys', field: 'methylation_lys_enabled' },
  ];

  const linkage = [
    { label: 'N-linked', field: 'n_linked' },
    { label: 'O-linked', field: 'o_linked' },
  ]

  const phosphorylationDetailButtonGroups = [
    { label: 'Amino Acids', options: phosphorylationAminoAcids },
  ];

  const glycosylationDetailButtonGroups = [
    { label: 'Amino Acids', options: glycosylationAminoAcids },
  ];

  const hydroxylationDetailButtonGroups = [
    { label: 'Amino Acids', options: hydroxylationAminoAcids },
  ];

  const methylationDetailButtonGroups = [
    { abel: 'Amino Acids', options: methylationAminoAcids },
  ];

  // <Col>
  //   {formHelper.textInput(`${fieldPrefixPostTransitional}.name`, 'Name of the post modification ', disabled, '')}
  // </Col>
  // </Row>
  // <Row className="mb-4 align-items-end">

  return (
    <>
      <Row className="mb-4 align-items-end">
        <h5 className="mb-3">Sequence modifications</h5>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_n_terminal`, 'N-terminal', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_c_terminal`, 'C-terminal', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_insertion`, 'Insertion', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_deletion`, 'Deletion', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_mutation`, 'Mutation', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_other`, 'Others', disabled)}
        </Col>
      </Row>
      {
        (proteinSequenceModification?.modification_n_terminal || proteinSequenceModification?.modification_c_terminal) && (
          <Row className="mb-4 align-items-end">
            {
              proteinSequenceModification?.modification_n_terminal && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_n_terminal_details`,
                      'Details for N-terminal modifications', disabled, ''
                    )
                  }
                </Col>
              )
            }
            {
              proteinSequenceModification?.modification_c_terminal && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_c_terminal_details`,
                      'Details for C-terminal modifications', disabled, ''
                    )
                  }
                </Col>
              )
            }
          </Row>
        )
      }
      {
        (proteinSequenceModification?.modification_deletion || proteinSequenceModification?.modification_insertion) && (
          <Row className="mb-4 align-items-end">
            {
              proteinSequenceModification?.modification_insertion && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_insertion_details`, 'Details for insertion', disabled, ''
                    )
                  }
                </Col>
              )
            }
            {
              proteinSequenceModification?.modification_deletion && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_deletion_details`, 'Details for deletion', disabled, ''
                    )
                  }
                </Col>
              )
            }
          </Row>
        )
      }
      {
        (proteinSequenceModification?.modification_mutation || proteinSequenceModification?.modification_other) && (
          <Row className="mb-4 align-items-end">
            {
              proteinSequenceModification?.modification_mutation && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_mutation_details`, 'Details for mutation', disabled, ''
                    )
                  }
                </Col>
              )
            }
            {
              proteinSequenceModification?.modification_other && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_other_details`, 'Details for other modifications', disabled, ''
                    )
                  }
                </Col>
              )
            }
          </Row>
        )
      }

      <Row className="mb-4 align-items-end">
        <h5 className="mb-3">Posttranslational modifications</h5>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.phosphorylation_enabled`, 'Phosphorylation', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.glycosylation_enabled`, 'Glycosylation', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.acetylation_enabled`, 'Acetylation', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.hydroxylation_enabled`, 'Hydroxylation', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.methylation_enabled`, 'Methylation', disabled)}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.other_modifications_enabled`, 'Others', disabled)}
        </Col>
      </Row>

      {
        postTranslationalModifications?.phosphorylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'phosphorylation', fieldPrefixPostTransitional, 'details', phosphorylationDetailButtonGroups,
          'Details for Phosphorylation', disabled
        )
      }
      {
        postTranslationalModifications?.glycosylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'glycosylation', fieldPrefixPostTransitional, 'details', glycosylationDetailButtonGroups,
          'Details for Glycosylation', disabled
        )
      }
      {
        postTranslationalModifications?.acetylation_enabled && (
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">Details for Acetylation</h5>
              {formHelper.inputGroupTextOrNumericInput(
                `${fieldPrefixPostTransitional}.acetylation_lysin_number`, '', 'Lysin No', 'number', disabled, ''
              )}
            </Col>
          </Row>
        )
      }
      {
        postTranslationalModifications?.hydroxylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'hydroxylation', fieldPrefixPostTransitional, 'details', hydroxylationDetailButtonGroups,
          'Details for Hydroxylation', disabled
        )
      }
      {
        postTranslationalModifications?.methylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'methylation', fieldPrefixPostTransitional, 'details', methylationDetailButtonGroups,
          'Details for Methylation', disabled
        )
      }
      {
        postTranslationalModifications?.other_modifications_enabled && (
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">Details for other modifications</h5>
              {formHelper.textInput(
                `${fieldPrefixPostTransitional}.other_modifications_details`, 'Detail', disabled, ''
              )}
            </Col>
          </Row>
        )
      }
    </>
  );
}

export default observer(SequenceAndPostTranslationalModificationForm);
