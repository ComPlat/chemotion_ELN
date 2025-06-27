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
  let sbmmSample = sbmmStore.sequence_based_macromolecule_sample;
  const formHelper = initFormHelper(sbmmSample, sbmmStore);
  const disabled = readonly ? true : false;
  const generalAccordionIdent = `${sbmmSample.id}-general`;
  const sampleAccordionIdent = `${sbmmSample.id}-sample`;

  useEffect(() => {
    if (!sbmmStore.toggable_contents.hasOwnProperty(generalAccordionIdent)) {
      sbmmStore.toggleContent(generalAccordionIdent);
    }
    if (showSearchFields) {
      sbmmStore.toggleSearchOptions(sbmmSample.id, true);
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
    isProtein && ['uniprot', 'uniprot_modified'].includes(uniprotDerivationValue);

  const visibleForUnkownOrModification = isProtein && !['', undefined, 'uniprot'].includes(uniprotDerivationValue);

  const hasReference = isProtein && (
    (
      uniprotDerivationValue === 'uniprot'
      && sbmmSample.sequence_based_macromolecule?.primary_accession
    )
    || (
      uniprotDerivationValue === 'uniprot_modified'
      && (sbmmSample.sequence_based_macromolecule?.parent_identifier || sbmmSample.sequence_based_macromolecule?.parent.id)
    )
    || uniprotDerivationValue === 'uniprot_unknown'
  );
  const showSearchFields = (sbmmSample.isNew && !hasReference) || sbmmStore.show_search_options[sbmmSample.id];
  const showNoSearchFields = (sbmmSample.isNew && hasReference && !sbmmStore.show_search_options[sbmmSample.id])
    || !sbmmStore.show_search_options[sbmmSample.id];

  const searchable = visibleForUniprotOrModification
    && sbmmSample.sequence_based_macromolecule.search_field
    && sbmmSample.sequence_based_macromolecule.search_term;

  const visibleForModification = isProtein && uniprotDerivationValue == 'uniprot_modified' && !hasReference;

  const showIfReferenceSelected = hasReference
    || parent?.other_reference_id || uniprotDerivationValue === 'uniprot_unknown';

  const showIfEnzymeIsSelected = sbmmSample.function_or_application === 'enzyme';

  const showReference = visibleForUniprotOrModification && (parent?.primary_accession || parent?.id);

  const noReferenceError = sbmmSample.errors.sequence_based_macromolecule?.primary_accession
    || sbmmSample.errors.sequence_based_macromolecule?.parent_identifier;

  const errorInGeneralDescription = Object.keys(sbmmSample.errors).length >= 1
    && (sbmmSample.errors.sequence_based_macromolecule?.primary_accession
      || sbmmSample.errors.sequence_based_macromolecule?.parent_identifier
      || sbmmSample.errors.sequence_based_macromolecule?.sbmm_subtype
      || sbmmSample.errors.sequence_based_macromolecule?.uniprot_derivation
      || sbmmSample.errors?.reference)

  const derivationLabelWithIcon = (
    <>
      Existence in UniProt or reference
      <i className="text-danger ms-1 fa fa-exclamation-triangle" />
    </>
  );

  const sampleHeaderShortLabel = sbmmSample.short_label ? ` - ${sbmmSample.short_label}` : '';

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
    const dropped_sbmm = item.element.sequence_based_macromolecule;
    
    sbmmStore.setSbmmBySearchResultOrDND(dropped_sbmm, 'full_sbmm', '');
    sbmmStore.toggleSearchOptions(sbmmSample.id, false);
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
    if (showNoSearchFields) { return null; }

    const dndClassName = isOver && canDrop ? ' dnd-zone-over' : '';
    const disabledClassName = searchable ? ' bg-gray-200' : '';

    return (
      <Row className="mb-4">
        <Col>
          <label className="form-label">Reference</label>
          <div
            key="element-dropzone-SEQUENCE_BASED_MACROMOLECULE"
            ref={(node) => searchable ? node : drop(node)}
            className={`p-2 dnd-zone text-center text-gray-600${dndClassName}${disabledClassName}`}
          >
            Drop a SBMM here to create a new sample of this SBMM
          </div>
        </Col>
      </Row>
    );
  }

  const toggleButtonForSearchOptions = () => {
    if (!hasReference) { return null; }

    const buttonText = sbmmStore.show_search_options[sbmmSample.id] ? 'Close' : 'Reopen';
    const searchOptionsVisible = sbmmStore.show_search_options[sbmmSample.id] ? false : true;

    return (
      <Button variant="primary" onClick={() => sbmmStore.toggleSearchOptions(sbmmSample.id, searchOptionsVisible)}>
        {buttonText} search options
      </Button>
    )
  }

  const searchFieldsForUniprotOrModification = () => {
    if (!visibleForUniprotOrModification) { return null }

    return (
      <>
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
      </>
    )
  }

  return (
    <Form>
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
            {dropAreaForReference()}
            <Row className="mb-4">
              <Col>
                {
                  formHelper.selectInput(
                    'sequence_based_macromolecule.sbmm_type', 'Type', sbmmType, disabled, '', true
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
                  uniprotDerivation, (sbmmSample.isNew ? false : true), 'Can only be changed during creation', true
                )}
              </Col>
              <Col className="col-2 align-self-end">
                {toggleButtonForSearchOptions()}
              </Col>
            </Row>

            {
              showSearchFields && visibleForUniprotOrModification && (
                <Row className="mb-4">
                  {searchFieldsForUniprotOrModification()}
                </Row>
              )
            }
            {
              (!hasReference && noReferenceError) && (
                <div className="text-danger">
                  Please choose a reference
                </div>
              )
            }
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {
        visibleForModification && (
          <ReferenceAndModificationForm
            ident="dnd_reference"
            readonly={readonly}
            key="dnd_reference_modification"
          />
        )
      }
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
                Sample Characteristics{sampleHeaderShortLabel}
              </Accordion.Header>
              <Accordion.Body>
                <h5 className="mb-3">Application</h5>
                <Row className="mb-4">
                  <Col>
                    {formHelper.textInput('name', 'Name', '')}
                  </Col>
                  <Col>
                    {formHelper.selectInput(
                      'function_or_application', 'Function or application', sampleFunctionOrApplication, disabled, '', ''
                    )}
                  </Col>
                </Row>

                <h5 className="mb-3">Sample stocks characteristics</h5>
                <Row className="mb-4">
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
                <Row className="mb-4">
                  <Col>
                    {formHelper.unitInput('volume_as_used_value', 'Volume as used', 'volumes', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mol_value', 'Amount as used', 'amount_substance', disabled, '')}
                  </Col>
                  <Col className="align-self-end">
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
