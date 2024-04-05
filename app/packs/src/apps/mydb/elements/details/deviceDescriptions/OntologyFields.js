import React, { useCallback } from 'react';
import { FormGroup, Modal, Button, ListGroup, ListGroupItem, Panel } from 'react-bootstrap';
import OntologySelect from './OntologySelect';
import { cloneDeep } from 'lodash';
import GenericSGDetails from 'src/components/generic/GenericSGDetails';
import { GenInterface, GenButtonReload } from 'chem-generic-ui';
import UserStore from 'src/stores/alt/stores/UserStore';
import DeviceDescription from 'src/models/DeviceDescription';
import Segment from 'src/models/Segment';
import MatrixCheck from 'src/components/common/MatrixCheck';
import OntologySortableList from './OntologySortableList';

const onNaviClick = (type, id) => {
  console.log('navi', type, id);
  //const { currentCollection, isSync } = UIStore.getState();
  //const collectionUrl = !isNaN(id)
  //  ? `${currentCollection.id}/${type}/${id}`
  //  : `${currentCollection.id}/${type}`;
  //Aviator.navigate(
  //  isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`
  //);
};

const addOntology = (selectedData, paths, store, element) => {
  const newOntology = { data: selectedData, paths: paths };
  const ontologies = element['ontologies'] || [];

  const value = ontologies.concat(newOntology);
  store.changeDeviceDescription('ontologies', value);
  store.toggleOntologyModal();
}

const deleteOntology = (store, element, index) => {
  if (!element['ontologies']) { return }

  let ontologies = [];
  element['ontologies'].map((currentOntology) => {
    if (currentOntology.data.short_form === element['ontologies'][index].data.short_form) {
      const deletedOntology = { ...currentOntology };
      deletedOntology.data.is_deleted = true;
      ontologies.push(deletedOntology);
    } else {
      ontologies.push(currentOntology);
    }
  });

  // delete directly
  // element['ontologies'].splice(index, (index >= 0 ? 1 : 0));
  store.changeDeviceDescription('ontologies', ontologies);
}

const undoDelete = (store, element, index) => {
  let ontologies = [];
  element['ontologies'].map((currentOntology) => {
    if (currentOntology.data.short_form === element['ontologies'][index].data.short_form) {
      const deletedOntology = { ...currentOntology };
      deletedOntology.data.is_deleted = false;
      ontologies.push(deletedOntology);
    } else {
      ontologies.push(currentOntology);
    }
  });

  store.changeDeviceDescription('ontologies', ontologies);
}

const changeOntologyMode = (store) => {
  const newMode = store.ontology_mode == 'edit' ? 'order' : 'edit';
  store.changeOntologyMode(newMode);
}

const ontologyModal = (store, element) => {
  return (
    <Modal backdrop="static" show={store.show_ontology_modal} onHide={() => store.toggleOntologyModal()}>
      <Modal.Header closeButton>
        <Modal.Title>Select Ontology</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <OntologySelect fnSelected={addOntology} store={store} element={element} />
      </Modal.Body>
    </Modal>
  );
}

const addOntologyButton = (store, element) => {
  return (
    <>
      <Button
        bsStyle="success"
        bsSize="xsmall"
        className="add-row"
        onClick={() => store.toggleOntologyModal()}
      >
        <i className="fa fa-plus icon-margin-right" />
        Add ontology
      </Button>
      {ontologyModal(store, element)}
    </>
  );
}

const ontologyModeButton = (store, element) => {
  const buttonText = store.ontology_mode === 'order' ? 'Order mode' : 'Edit mode';
  const buttonIcon = store.ontology_mode === 'order' ? 'fa fa-reorder' : 'fa fa-edit';
  const styleClass = store.ontology_mode === 'order' ? 'success' : 'primary';
  const readonly = !element['ontologies'] ? true : false;
  return (
    <Button
      disabled={readonly}
      bsSize="xsmall"
      bsStyle={styleClass}
      className="add-row"
      onClick={() => changeOntologyMode(store)}
    >
      <i className={`${buttonIcon} icon-margin-right`} aria-hidden="true" />
      {buttonText}
    </Button>
  );
}

const deleteOntologyButton = (store, element, index) => {
  if (element['ontologies'][index].data.is_deleted) { return null; }

  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      onClick={() => deleteOntology(store, element, index)}
      className="delete-in-list"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );
}

const undoDeleteButton = (store, element, index) => {
  const isDeleted = element['ontologies'][index].data.is_deleted;
  if (isDeleted === undefined || !isDeleted) { return null; }

  return (
    <Button
      bsSize="xsmall"
      bsStyle="danger"
      className="delete-in-list"
      onClick={() => undoDelete(store, element, index)}
    >
      <i className="fa fa-undo" aria-hidden="true" />
    </Button>
  );
}

const ontologySegmentList = (store, element, handleSegmentsChange) => {
  let list = [];
  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  let segmentKlass = {}

  if (element['ontologies']) {
    element['ontologies']
      .sort((a, b) => a.index - b.index)
      .forEach((ontology, i) => {
        if (!ontology['segments']) { return }

        let rows = [];
        const className = i == 0 ? 'first' : '';

        ontology['segments'].forEach((segment) => {
          //segmentKlass = segmentKlasses.find(
          //  (s) => s.element_klass && s.element_klass.name === element.type && segment['segment_klass_id'] == s.id
          //);
          segmentKlass = element['segments'].find((s) => {
            return segment['segment_klass_id'] === s.segment_klass_id;
          });
          //console.log(segmentKlass, element['segments'], segment['segment_klass_id']);

          let segmentElement = {};
          if (segmentKlass) {
            segmentElement = segmentKlass;
          } else {
            segmentElement = Segment.buildEmpty(cloneDeep(segmentKlass));
          }
          // revision und reload buttons (GenericSGDetail)
          // <div className="grouped-fields-row ontology-segments">

          rows.push(
            <GenInterface
              generic={segmentElement}
              fnChange={handleSegmentsChange}
              extLayers={[]}
              genId={0}
              isPreview={false}
              isSearch={false}
              isActiveWF={false}
              fnNavi={onNaviClick}
            />
          );
        });
        list.push(
          <Panel className={`ontology-segments ${className}`} defaultExpanded>
            <Panel.Heading>
              <Panel.Title toggle>{`Ontology: ${ontology['data']['label']}`}</Panel.Title>
            </Panel.Heading>
            <Panel.Collapse>
              <Panel.Body>{rows}</Panel.Body>
            </Panel.Collapse>
          </Panel>
        );
      });
  }

  return list;
}

//const ontologySegmentList = (store, element, handleSegmentsChange) => {
//  let list = [];
//  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
//  let segmentKlass = {}
//
//  if (element['ontologies']) {
//    element['ontologies']
//      .sort((a, b) => a.index - b.index)
//      .forEach((ontology, i) => {
//        if (!ontology['segments']) { return }
//
//        let rows = [];
//        const className = i == 0 ? 'first' : '';
//
//        ontology['segments'].forEach((segment) => {
//          segmentKlass = segmentKlasses.find(
//            (s) => s.element_klass && s.element_klass.name === element.type && segment['segment_klass_id'] == s.id
//          );
//
//          let segmentElement = {};
//          if (Object.keys(segment['segment']).length > 0) {
//            segmentElement = segment['segment'];
//          } else {
//            segmentElement = Segment.buildEmpty(cloneDeep(segmentKlass));
//          }
//          // revision und reload buttons (GenericSGDetail)
//          // <div className="grouped-fields-row ontology-segments">
//
//          rows.push(
//            <GenInterface
//              generic={segmentElement}
//              fnChange={handleSegmentsChange}
//              extLayers={[]}
//              genId={0}
//              isPreview={false}
//              isSearch={false}
//              isActiveWF={false}
//              fnNavi={onNaviClick}
//            />
//          );
//        });
//        list.push(
//          <Panel className={`ontology-segments ${className}`} defaultExpanded>
//            <Panel.Heading>
//              <Panel.Title toggle>{`Ontology: ${ontology['data']['label']}`}</Panel.Title>
//            </Panel.Heading>
//            <Panel.Collapse>
//              <Panel.Body>{rows}</Panel.Body>
//            </Panel.Collapse>
//          </Panel>
//        );
//      });
//  }
//
//  return list;
//}

const ontologySortableListItem = (store, element) => {
  return (
    <OntologySortableList
      key={`${store.key_prefix}-ontologies-row`}
      store={store}
      element={element}
    />
  );
};

const ontologyListItem = (store, element) => {
  let rows = [];
  element['ontologies']
    .sort((a, b) => a.index - b.index)
    .map((ontology, i) => {
      const deletedClass = ontology.data.is_deleted ? 'deleted-ontology' : '';
      const hasNoSegmentsClass = !ontology.segments ? 'without-segments' : '';
      rows.push(
        <ListGroupItem
          header={ontology.data.label}
          key={`${store.key_prefix}-${ontology.data.label}-${i}`}
          className={`list-group-with-button ${deletedClass} ${hasNoSegmentsClass}`}
        >
          {ontology.paths.join(' / ')}
          {undoDeleteButton(store, element, i)}
          {deleteOntologyButton(store, element, i)}
        </ListGroupItem>
      );
    });
  return rows;
}

const ontologiesList = (store, element) => {
  let list = [];

  if (element['ontologies']) {
    if (store.ontology_mode == 'edit') {
      list.push(
        <ListGroup className="ontology-list" key="ontology_list">
          {ontologyListItem(store, element)}
        </ListGroup>
      );
    } else {
      list = ontologySortableListItem(store, element);
    }
  }

  return (
    <FormGroup key={`${store.key_prefix}- ${element['name']}`}>
      <div className="grouped-fields-row">
        {ontologyModeButton(store, element)}
        {addOntologyButton(store, element)}
      </div>
      {list}
    </FormGroup>
  );
}

export { ontologiesList, ontologySegmentList };

