import React, { useContext } from 'react';
import { Accordion } from 'react-bootstrap';
import { toggleContent } from '../FormFields';
import OntologiesList from '../OntologiesList';
import OntologySegmentsList from '../OntologySegmentsList';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DetailsForm = () => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;

  return (
    <>
      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.ontology && 'ontology'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'ontology')}
      >
        <Accordion.Item eventKey="ontology">
          <Accordion.Header>
            Ontology Classification
          </Accordion.Header>
          <Accordion.Body>
            <div className="mb-3">
              <OntologiesList
                key="ontologies-list-component"
                store={deviceDescriptionsStore}
                element={deviceDescription}
              />
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <OntologySegmentsList
        key="ontology-segments-list-component"
        store={deviceDescriptionsStore}
        element={deviceDescription}
        isSelection={false}
      />
    </>
  );
}

export default observer(DetailsForm);
