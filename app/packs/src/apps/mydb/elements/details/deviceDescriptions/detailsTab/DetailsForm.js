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
    console.log(segment, segment.segment_klass_id);
    //console.log(deviceDescription.segments);
    //console.log(deviceDescription['ontologies']);
    let ontologies = [];
    let segId = deviceDescription.segments.findIndex((s) => s.segment_klass_id == segment.segment_klass_id);
    console.log(segId);

    deviceDescription['ontologies'].forEach((ontology, i) => {
      if (ontology['segments']) {
        const idx = ontology['segments'].findIndex((s) => s.segment_klass_id === segment.segment_klass_id);
        if (idx !== -1) {
          let changedOntology = { ...ontology };
          changedOntology['segments'][idx].segment = segment;
          ontologies.push(changedOntology);
        } else {
          ontologies.push(ontology);
        }
      } else {
        ontologies.push(ontology);
      }
    });
    //const { sample } = this.state;
    //const { segments } = sample;
    //const idx = findIndex(segments, (o) => o.segment_klass_id === se.segment_klass_id);
    //if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    //sample.segments = segments;
    //this.setState({ sample });
    let segments = [...deviceDescription.segments];
    const sid = segments.findIndex((o) => o.segment_klass_id === segment.segment_klass_id);
    if (sid >= 0) { segments.splice(sid, 1, segment); } else { segments.push(segment); }

    console.log(ontologies, segments);
    deviceDescriptionsStore.changeDeviceDescription('ontologies', ontologies);
    deviceDescriptionsStore.changeDeviceDescription('segments', segments);
  }

  return (
    <div className="form-fields">
      {headlineWithToggle(deviceDescriptionsStore, 'ontology', 'Ontology Classification')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.ontology} className="grouped-fields-row cols-1">
        <div>
          {ontologiesList(deviceDescriptionsStore, deviceDescription)}
        </div>
      </Collapse>

      {ontologySegmentList(deviceDescriptionsStore, deviceDescription, handleSegmentsChange)}
    </div>
  );
}

export default observer(DetailsForm);
