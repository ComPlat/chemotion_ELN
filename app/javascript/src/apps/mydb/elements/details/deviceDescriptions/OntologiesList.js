import React from 'react';
import { Modal, Button, ListGroup, ButtonGroup } from 'react-bootstrap';
import OntologySelect from './OntologySelect';
import OntologySortableList from './OntologySortableList';
import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import { observer } from 'mobx-react';

const OntologiesList = ({ store, element }) => {
  const ontologies = element['ontologies'] || [];

  const addOntology = (selectedData, paths) => {
    let newOntology = { data: selectedData, paths: paths };
    let params = {
      id: element['id'],
      ontology: newOntology,
    }
    const oid = ontologies.findIndex((o) => o.data.short_form === newOntology.data.short_form);
    if (oid >= 0) {
      store.toggleOntologyModal();
      return;
    }

    DeviceDescriptionFetcher.fetchSegmentKlassIdsByNewOntology(element['id'], params)
      .then((result) => {
        if (result.length >= 1) {
          newOntology.segments = result;
        }
        const value = ontologies.concat(newOntology);
        store.changeDeviceDescription('ontologies', value);
        store.toggleOntologyModal();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  const deleteOntology = (index) => {
    if (ontologies.length < 1) { return }

    let updatedOntologies = [];

    // delete directly
    // ontologies.splice(index, (index >= 0 ? 1 : 0));

    ontologies.map((currentOntology) => {
      if (currentOntology.data.short_form === ontologies[index].data.short_form) {
        const deletedOntology = { ...currentOntology };
        deletedOntology.data.is_deleted = true;
        updatedOntologies.push(deletedOntology);
      } else {
        updatedOntologies.push(currentOntology);
      }
    });

    store.changeDeviceDescription('ontologies', updatedOntologies);
  }

  const undoDelete = (index) => {
    let updatedOntologies = [];
    ontologies.map((currentOntology) => {
      if (currentOntology.data.short_form === ontologies[index].data.short_form) {
        const deletedOntology = { ...currentOntology };
        deletedOntology.data.is_deleted = false;
        updatedOntologies.push(deletedOntology);
      } else {
        updatedOntologies.push(currentOntology);
      }
    });

    store.changeDeviceDescription('ontologies', updatedOntologies);
  }

  const changeOntologyMode = () => {
    const newMode = store.ontology_mode == 'edit' ? 'order' : 'edit';
    store.changeOntologyMode(newMode);
  }

  const ontologyModal = () => {
    if (!store.show_ontology_modal) { return null; }

    return (
      <Modal
        backdrop="static"
        show={store.show_ontology_modal}
        onHide={() => store.toggleOntologyModal()}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Select Ontology</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <OntologySelect fnSelected={addOntology} store={store} element={element} />
        </Modal.Body>
      </Modal>
    );
  }

  const addOntologyButton = () => {
    return (
      <Button
        size="xsm"
        variant="success"
        onClick={() => store.toggleOntologyModal()}
      >
        <i className="fa fa-plus me-1" />
        Add ontology
      </Button>
    );
  }

  const ontologyModeButton = () => {
    const readonly = ontologies < 1 ? true : false;

    return (
      <ButtonGroup>
        <ButtonGroupToggleButton
          size="xsm"
          active={store.ontology_mode === 'edit'}
          onClick={() => changeOntologyMode(store)}
          disabled={readonly}
        >
          <i className="fa fa-edit me-1" />
          Edit mode
        </ButtonGroupToggleButton>
        <ButtonGroupToggleButton
          size="xsm"
          active={store.ontology_mode === 'order'}
          onClick={() => changeOntologyMode(store)}
          disabled={readonly}
        >
          <i className="fa fa-reorder me-1" />
          Order mode
        </ButtonGroupToggleButton>
      </ButtonGroup>
    );
  }

  const deleteOntologyButton = (index) => {
    if (ontologies[index].data.is_deleted) { return null; }

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
  }

  const undoDeleteButton = (index) => {
    const isDeleted = ontologies[index].data.is_deleted;
    if (isDeleted === undefined || !isDeleted) { return null; }

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
  }

  const ontologyListItem = () => {
    let rows = [];

    ontologies
      .sort((a, b) => a.index - b.index)
      .map((ontology, index) => {
        const deletedClass = ontology.data.is_deleted ? ' text-decoration-line-through' : '';
        const backgroundColor = index % 2 === 0 ? 'bg-gray-100' : 'bg-white';
        const hasNoSegmentsClass = !ontology.segments ? ' text-gray-600' : '';

        if (store.ontology_mode == 'order') {
          rows.push(
            <OntologySortableList
              store={store}
              element={element}
              ontology={ontology}
              index={index}
              key={`sortable-list-${index}`}
            />
          );
        } else {
          rows.push(
            <ListGroup.Item
              key={`${store.key_prefix}-${ontology.data.label}-${index}`}
              className={`${backgroundColor}${deletedClass}${hasNoSegmentsClass}`}
              as="li"
            >
              <div>
                <h4>{ontology.data.label}</h4>
                <div className="d-flex justify-content-between align-items-center gap-2">
                  {ontology.paths.map((p) => p.label).join(' / ')}
                  <div>
                    {undoDeleteButton(index)}
                    {deleteOntologyButton(index)}
                  </div>
                </div>
              </div>
            </ListGroup.Item>
          );
        }
      });
    return rows;
  }

  return (
    <>
      <div className="d-flex justify-content-between mb-3" key={`${store.key_prefix}-${element['name']}`}>
        {ontologyModeButton()}
        {addOntologyButton()}
      </div>
      {
        element['ontologies'].length >= 1 && (
          <ListGroup key="ontology-list" as="ul">
            {ontologyListItem()}
          </ListGroup>
        )
      }
      {ontologyModal()}
    </>
  );
}

export default observer(OntologiesList);
