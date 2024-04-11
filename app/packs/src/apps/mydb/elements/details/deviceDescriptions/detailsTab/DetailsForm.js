import React, { useContext } from 'react';
import { Collapse } from 'react-bootstrap';
import {
  headlineWithToggle,
} from '../FormFields';
import { ontologiesList, ontologySegmentList } from '../OntologyFields';

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
    <div className="form-fields">
      {headlineWithToggle(deviceDescriptionsStore, 'ontology', 'Ontology Classification')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.ontology} className="grouped-fields-row cols-1">
        <div>
          {ontologiesList(deviceDescriptionsStore, deviceDescription)}
        </div>
      </Collapse>

      {ontologySegmentList(deviceDescriptionsStore, deviceDescription, handleSegmentsChange, handleRetrieveRevision)}
    </div>
  );
}

export default observer(DetailsForm);
