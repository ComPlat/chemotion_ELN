import React, { useContext, useEffect } from 'react';
import { Form, Row, Col, Accordion, Button, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import { useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ReferenceAndModificationForm from './ReferenceAndModificationForm';
import SearchResults from './SearchResults';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PropertiesForm = ({ readonly }) => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const sbmmSample = sbmmStore.sequence_based_macromolecule_sample;
  const formHelper = initFormHelper(sbmmSample, sbmmStore);
  const disabled = readonly ? true : false;
  const generalAccordionIdent = `${sbmmSample.id}-general`;
  const sampleAccordionIdent = `${sbmmSample.id}-sample`;

  useEffect(() => {
    if (!sbmmStore.toggable_contents.hasOwnProperty(generalAccordionIdent)) {
      sbmmStore.toggleContent(generalAccordionIdent);
    }
    if (sbmmSample.is_new) {
      sbmmStore.toggleSearchOptions(true);
    }
  }, []);

  const sbmmType = [{ label: 'Protein', value: 'protein' }];
  const sbmmSubType = [
    { label: 'Unmodified', value: 'unmodified' },
    { label: 'Glycoprotein', value: 'glycoprotein' },
  ];
  const uniprotDerivation = [
    { label: 'Does not exist', value: 'uniprot_unknown' },
    { label: 'Protein used as described in Uniprot / reference', value: 'uniprot' },
    { label: 'Used modified protein', value: 'uniprot_modified' },
  ];
  const sbmmSearchBy = [
    { label: 'UniProt ID', value: 'accession' },
    { label: 'Name', value: 'protein_name' },
    { label: 'EC-Number', value: 'ec' },
  ];
  const sampleFunctionOrApplication = [
    { label: 'Enzyme', value: 'enzyme' },
    { label: 'Hormone', value: 'hormone' },
    { label: 'Structural', value: 'structural' },
    { label: 'Component', value: 'component' },
    { label: 'Energy source', value: 'energy_source' },
  ];

  const isProtein = sbmmSample.sequence_based_macromolecule?.sbmm_type === 'protein';
  const uniprotDerivationValue = sbmmSample.sequence_based_macromolecule?.uniprot_derivation;
  const parent = sbmmSample.sequence_based_macromolecule?.parent
    ? sbmmSample.sequence_based_macromolecule.parent
    : sbmmSample.sequence_based_macromolecule;

  const visibleForUniprotOrModification =
    isProtein && !['', undefined, 'uniprot_unknown'].includes(uniprotDerivationValue);

  const visibleForUnkownOrModification = isProtein && !['', undefined, 'uniprot'].includes(uniprotDerivationValue);

  const showIfReferenceSelected =
    isProtein && (parent?.primary_accession || parent?.id
      || sbmmSample.sequence_based_macromolecule?.parent_identifier
      || parent?.other_reference_id || uniprotDerivationValue === 'uniprot_unknown');

  const showIfEnzymeIsSelected = sbmmSample.function_or_application === 'enzyme';

  const showReference = isProtein && !['', undefined, 'uniprot_unknown'].includes(uniprotDerivationValue)
    && !sbmmSample.errors?.reference && (parent?.primary_accession || parent?.id);

  const noPrimaryAccession = uniprotDerivationValue === 'uniprot'
    && sbmmSample.errors.sequence_based_macromolecule?.primary_accession
    && !sbmmSample.sequence_based_macromolecule?.primary_accession
    && sbmmSample.isNew

  const noParentIdentifier = uniprotDerivationValue === 'uniprot_modified'
    && sbmmSample.errors.sequence_based_macromolecule?.parent_identifier
    && !sbmmSample.sequence_based_macromolecule?.parent_identifier
    && sbmmSample.isNew

  const errorInGeneralDescription = Object.keys(sbmmSample.errors).length >= 1
    && (sbmmSample.errors.sequence_based_macromolecule?.primary_accession
      || sbmmSample.errors.sequence_based_macromolecule?.parent_identifier
      || sbmmSample.errors.sequence_based_macromolecule?.sbmm_subtype
      || sbmmSample.errors.sequence_based_macromolecule?.uniprot_derivation
      || sbmmSample.errors?.reference)

  const searchable = ['uniprot', 'uniprot_modified'].includes(uniprotDerivationValue)
    && sbmmSample.sequence_based_macromolecule.search_field
    && sbmmSample.sequence_based_macromolecule.search_term;

  const derivationLabelWithIcon = (
    <>
      Existence in UniProt or reference
      <i className="text-danger ms-1 fa fa-exclamation-triangle" />
    </>
  )

  const searchSequenceBasedMolecules = () => {
    if (searchable) {
      sbmmStore.searchForSequenceBasedMacromolecule(
        sbmmSample.sequence_based_macromolecule.search_term,
        sbmmSample.sequence_based_macromolecule.search_field
      );
      sbmmStore.openSearchResult();
    }
  }

  const handleDrop = (item) => {
    const result = item.element.sequence_based_macromolecule;
    const errorPath = ['errors', 'reference'];
    if (sbmmSample.errors?.reference) {
      sbmmSample = sbmmStore.removeError(sbmmSample, errorPath);
    }
    if (uniprotDerivationValue === 'uniprot' && result.uniprot_derivation !== 'uniprot') {
      sbmmSample = sbmmStore.setError(
        sbmmSample, errorPath, 'The sequence based macromolecule has not the right type. Only uniprot is allowed.'
      );
    } else {
      sbmmStore.setSbmmByResult(result);
      // sbmmStore.toggleSearchOptions(false);
    }
  }

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DragDropItemTypes['SEQUENCE_BASED_MACROMOLECULE'],
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    drop: (item) => {
      handleDrop(item);
    },
  });

  const dropAreaForReference = () => {
    return (
      <>
        <label className="form-label">Reference</label>
        <div
          key="element-dropzone-SEQUENCE_BASED_MACROMOLECULE"
          ref={(node) => drop(node)}
          className={`border border-dashed border-3 p-1 text-center text-gray-600 ${isOver && canDrop ? 'dnd-zone-over' : ''}`}
        >
          Drop SBMM here
        </div>
        {
          sbmmSample.errors?.reference && (
            <div className="text-danger mt-2">
              {sbmmSample.errors.reference}
            </div>
          )
        }
      </>
    );
  }

  return (
    <Form>
      <Row className="mb-4">
        <Col>
          {formHelper.textInput('name', 'Name', '')}
        </Col>
      </Row>

      <Accordion
        className={`mb-4 ${errorInGeneralDescription ? 'border border-danger' : ''}`}
        activeKey={sbmmStore.toggable_contents[generalAccordionIdent] && generalAccordionIdent}
        onSelect={() => sbmmStore.toggleContent(generalAccordionIdent)}
      >
        <Accordion.Item eventKey={generalAccordionIdent}>
          <Accordion.Header>
            General description
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4 align-items-end">
              <Col>
                {
                  formHelper.selectInput(
                    'sequence_based_macromolecule.sbmm_type', 'Type', sbmmType, disabled, ''
                  )
                }
              </Col>
              <Col>
                {
                  formHelper.selectInput(
                    'sequence_based_macromolecule.sbmm_subtype', 'Subtype of protein', sbmmSubType, disabled, ''
                  )
                }
              </Col>
              <Col>
                {formHelper.selectInput(
                  'sequence_based_macromolecule.uniprot_derivation',
                  derivationLabelWithIcon,
                  uniprotDerivation, (sbmmSample.isNew ? false : true), 'Can only be changed during creation'
                )}
              </Col>
              <Col className="col-2">
                {
                  !sbmmStore.show_search_options && (
                    <Button variant="primary" onClick={() => sbmmStore.toggleSearchOptions(true)}>
                      Reopen search options
                    </Button>
                  )
                }
              </Col>
            </Row>

            {
              (visibleForUniprotOrModification && (sbmmSample.is_new || sbmmStore.show_search_options)) && (
                <Row className="mb-4">
                  <Col>
                    {!searchable && dropAreaForReference()}
                  </Col>
                  <Col>
                    {
                      formHelper.selectInput(
                        'sequence_based_macromolecule.search_field', 'Search UniProt or Reference', sbmmSearchBy,
                        disabled, '', ''
                      )
                    }
                  </Col>
                  <Col>
                    {formHelper.textInput('sequence_based_macromolecule.search_term', 'Search term', disabled, '')}
                  </Col>
                  <Col className="align-self-end col-2">
                    {
                      searchable && (
                        <Button variant="primary" onClick={() => searchSequenceBasedMolecules()}>
                          Search
                        </Button>
                      )
                    }
                  </Col>
                </Row>
              )
            }
            {
              (noPrimaryAccession || noParentIdentifier) && (
                <div className="text-danger">
                  Please choose a reference
                </div>
              )
            }
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {
        showReference && (
          <ReferenceAndModificationForm
            ident="reference"
            readonly={readonly}
            key="reference_uniprot"
          />
        )
      }
      {
        showIfReferenceSelected && visibleForUnkownOrModification && (
          <ReferenceAndModificationForm
            ident="sequence_modifications"
            readonly={readonly}
            key="sequence_modifications_uniprot"
          />
        )
      }

      {
        showIfReferenceSelected && (
          <Accordion
            className="mb-4"
            activeKey={sbmmStore.toggable_contents[sampleAccordionIdent] && sampleAccordionIdent}
            onSelect={() => sbmmStore.toggleContent(sampleAccordionIdent)}
          >
            <Accordion.Item eventKey={sampleAccordionIdent}>
              <Accordion.Header>
                Sample Characteristics
              </Accordion.Header>
              <Accordion.Body>
                <h5 className="mb-3">Application</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput(
                      'function_or_application', 'Function or application', sampleFunctionOrApplication, disabled, '', ''
                    )}
                  </Col>
                </Row>

                <h5 className="mb-3">Sample stocks characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('concentration_value', 'Concentration', 'concentration', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('molarity_value', 'Molarity', 'molarity', disabled, '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <>
                        <Col>
                          {formHelper.unitInput(
                            'activity_per_volume_value', 'Activity in U/L', 'activity_per_volume', disabled, ''
                          )}
                        </Col>
                        <Col>
                          {formHelper.unitInput(
                            'activity_per_mass_value', 'Activity in U/g', 'activity_per_mass', disabled, ''
                          )}
                        </Col>
                      </>
                    )
                  }
                </Row>

                <h5 className="mb-3">Sample characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('volume_as_used_value', 'Volume as used', 'volumes', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mol_value', 'Amount as used', 'amount_substance', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mass_value', '', 'amount_mass', disabled, '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <Col>
                        {formHelper.unitInput('activity_value', 'Activity', 'activity', disabled, '')}
                      </Col>
                    )
                  }
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )
      }
      {
        sbmmStore.show_search_result && (
          <SearchResults />
        )
      }
    </Form>
  );
}

export default observer(PropertiesForm);
