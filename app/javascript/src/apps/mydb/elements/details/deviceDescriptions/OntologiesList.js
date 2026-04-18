import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  ListGroup,
} from 'react-bootstrap';
import OntologySegmentsList from 'src/apps/mydb/elements/details/deviceDescriptions/OntologySegmentsList';
import OntologySelect from 'src/apps/mydb/elements/details/deviceDescriptions/OntologySelect';
import OntologySortableList from 'src/apps/mydb/elements/details/deviceDescriptions/OntologySortableList';
import AppModal from 'src/components/common/AppModal';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';

function OntologiesList({ store, element }) {
  const ontologies = element.ontologies || [];

  const editOntologyForm = (index) => {
    store.toggleOntologyModal();
    store.toggleOntologySelect();
    store.toggleOntologyFormSelection();
    store.setOntologyIndexForEdit(index);
  };

  const deleteOntology = (index) => {
    if (ontologies.length < 1) {
      return;
    }

    const updatedOntologies = ontologies.map((currentOntology) => {
      if (currentOntology.data.short_form === ontologies[index].data.short_form) {
        return { ...currentOntology, is_deleted: true };
      }

      return currentOntology;
    });

    store.changeDeviceDescription('ontologies', updatedOntologies);
  };

  const undoDelete = (index) => {
    const updatedOntologies = ontologies.map((currentOntology) => {
      if (currentOntology.data.short_form === ontologies[index].data.short_form) {
        return { ...currentOntology, is_deleted: false };
      }

      return currentOntology;
    });

    store.changeDeviceDescription('ontologies', updatedOntologies);
  };

  const changeOntologyMode = () => {
    const newMode = store.ontology_mode === 'edit' ? 'order' : 'edit';
    store.changeOntologyMode(newMode);
  };

  const ontologyModal = () => {
    if (!store.show_ontology_modal) {
      return null;
    }

    const ontologyModalTitle = store.show_ontology_form_selection
      ? 'Select Ontology forms'
      : 'Select Ontology';
    const modalSize = store.show_ontology_form_selection ? 'lg' : 'md';

    return (
      <AppModal
        title={ontologyModalTitle}
        show={store.show_ontology_modal}
        onHide={() => store.closeOntologyModal()}
        size={modalSize}
        showFooter={store.show_ontology_form_selection}
        closeLabel="Close"
      >
        {store.show_ontology_select && (
          <OntologySelect store={store} element={element} />
        )}
        {store.show_ontology_form_selection && (
          <div className="overflow-auto vh-70">
            <OntologySegmentsList
              key="ontology-segments-list-form-selection"
              store={store}
              element={element}
              isSelection
            />
          </div>
        )}
      </AppModal>
    );
  };

  const addOntologyButton = () => (
    <Button
      size="xsm"
      variant="success"
      onClick={() => store.toggleOntologyModal()}
    >
      <i className="fa fa-plus me-1" />
      Add ontology
    </Button>
  );

  const ontologyModeButton = () => {
    const readonly = ontologies.length < 1;

    return (
      <ButtonGroup>
        <ButtonGroupToggleButton
          size="xsm"
          active={store.ontology_mode === 'edit'}
          onClick={changeOntologyMode}
          disabled={readonly}
        >
          <i className="fa fa-edit me-1" />
          Edit mode
        </ButtonGroupToggleButton>
        <ButtonGroupToggleButton
          size="xsm"
          active={store.ontology_mode === 'order'}
          onClick={changeOntologyMode}
          disabled={readonly}
        >
          <i className="fa fa-reorder me-1" />
          Order mode
        </ButtonGroupToggleButton>
      </ButtonGroup>
    );
  };

  const editButton = (index, hasSegment) => {
    if (ontologies[index].is_deleted || !hasSegment) {
      return null;
    }

    return (
      <Button
        size="sm"
        variant="warning"
        onClick={() => editOntologyForm(index)}
        className="px-2 py-1"
      >
        <i className="fa fa-edit" />
      </Button>
    );
  };

  const deleteOntologyButton = (index) => {
    if (ontologies[index].is_deleted) {
      return null;
    }

    return (
      <Button
        size="sm"
        variant="danger"
        onClick={() => deleteOntology(index)}
        className="px-2 py-1"
      >
        <i className="fa fa-trash-o" />
      </Button>
    );
  };

  const undoDeleteButton = (index) => {
    const isDeleted = ontologies[index].is_deleted;
    if (isDeleted === undefined || !isDeleted) {
      return null;
    }

    return (
      <Button
        size="sm"
        variant="danger"
        className="px-2 py-1"
        onClick={() => undoDelete(index)}
      >
        <i className="fa fa-undo" aria-hidden="true" />
      </Button>
    );
  };

  const ontologyListItem = () => {
    const sortedOntologies = [...ontologies].sort((a, b) => a.index - b.index);

    return sortedOntologies.map((ontology, index) => {
      const deletedClass = ontology.is_deleted ? ' text-decoration-line-through' : '';
      const backgroundColor = index % 2 === 0 ? 'bg-gray-100' : 'bg-white';
      const hasNoSegmentsClass = !ontology.segments ? ' text-gray-600' : '';
      const ontologyKey = `${store.key_prefix}-${ontology.data.short_form || ontology.data.label}`;

      if (store.ontology_mode === 'order') {
        return (
          <OntologySortableList
            store={store}
            element={element}
            ontology={ontology}
            index={index}
            key={`sortable-list-${ontologyKey}`}
          />
        );
      }

      return (
        <ListGroup.Item
          key={ontologyKey}
          className={`${backgroundColor}${deletedClass}${hasNoSegmentsClass}`}
          as="li"
        >
          <div>
            <div className="d-flex justify-content-between align-items-center gap-2">
              <h4>{ontology.data.label}</h4>
              <div>
                <ButtonToolbar className="flex-nowrap">
                  {editButton(index, ontology.segments)}
                  {undoDeleteButton(index)}
                  {deleteOntologyButton(index)}
                </ButtonToolbar>
              </div>
            </div>
          </div>
        </ListGroup.Item>
      );
    });
  };

  return (
    <>
      <div className="d-flex justify-content-between mb-3" key={`${store.key_prefix}-${element.name}`}>
        {ontologyModeButton()}
        {addOntologyButton()}
      </div>
      {element.ontologies.length >= 1 && (
        <ListGroup key="ontology-list" as="ul">
          {ontologyListItem()}
        </ListGroup>
      )}
      {ontologyModal()}
    </>
  );
}

OntologiesList.propTypes = {
  store: PropTypes.shape({
    key_prefix: PropTypes.string,
    ontology_mode: PropTypes.string,
    show_ontology_modal: PropTypes.bool,
    show_ontology_select: PropTypes.bool,
    show_ontology_form_selection: PropTypes.bool,
    toggleOntologyModal: PropTypes.func.isRequired,
    toggleOntologySelect: PropTypes.func.isRequired,
    toggleOntologyFormSelection: PropTypes.func.isRequired,
    setOntologyIndexForEdit: PropTypes.func.isRequired,
    changeDeviceDescription: PropTypes.func.isRequired,
    changeOntologyMode: PropTypes.func.isRequired,
    closeOntologyModal: PropTypes.func.isRequired,
  }).isRequired,
  element: PropTypes.shape({
    name: PropTypes.string,
    ontologies: PropTypes.arrayOf(PropTypes.shape({
      index: PropTypes.number,
      is_deleted: PropTypes.bool,
      segments: PropTypes.oneOfType([PropTypes.array, PropTypes.bool, PropTypes.object]),
      data: PropTypes.shape({
        label: PropTypes.string,
        short_form: PropTypes.string,
      }).isRequired,
    })),
  }).isRequired,
};

export default observer(OntologiesList);
