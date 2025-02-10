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

  const handleSegmentsChange = (segment) => {
    let segments = [...deviceDescription.segments];
    const sid = segments.findIndex((s) => s.segment_klass_id === segment.segment_klass_id);
    if (sid >= 0) { segments.splice(sid, 1, segment); } else { segments.push(segment); }

    deviceDescriptionsStore.changeDeviceDescription('segments', segments);
  }

  const handleRetrieveRevision = (revision, cb) => {
    let segments = [...deviceDescription.segments];
    const selectedSegmentId = deviceDescriptionsStore.selected_segment_id;
    const sid = segments.findIndex((s) => s.id === selectedSegmentId);

    if (sid !== -1) {
      segments[sid].properties = revision;
      cb();
      deviceDescriptionsStore.changeDeviceDescription('segments', segments);
      deviceDescriptionsStore.setSelectedSegmentId(0);
    } 
  }

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
        handleSegmentsChange={handleSegmentsChange}
        handleRetrieveRevision={handleRetrieveRevision}
      />
    </>
  );
}

export default observer(DetailsForm);
