import React from 'react';
import { Select } from 'src/components/common/Select';

const OntologySelect = ({ store, element }) => {
  const ontologies = store.ontologies;
  let options = [];

  if (ontologies.length >= 1) {
    ontologies.map((ontology) => {
      options.push({ label: ontology.label, value: ontology.short_form })
    });
  }

  const addOntology = (selected) => {
    const ontology = ontologies.find((o) => o.short_form === selected.value);

    if (ontology) {
      const elementOntologies = element['ontologies'] || [];
      const segments = ontology.segment_ids.map((s) => {
        return { show: true, segment_klass_id: s }
      });

      const newOntology = {
        data: ontology,
        paths: [],
        index: elementOntologies.length,
        segments: segments,
      };

      if (segments.length >= 1) {
        store.setOntologyIndexForEdit(elementOntologies.length);
        store.toggleOntologySelect();
        store.toggleOntologyFormSelection();
      } else {
        store.toggleOntologyModal();
      }

      const value = elementOntologies.concat(newOntology);
      store.changeDeviceDescription('ontologies', value);
      
    } else {
      store.toggleOntologyModal();
    }
  }

  return (
    <Select
      options={options}
      isClearable={true}
      onChange={(selected) => addOntology(selected)}
    />
  );

}

export default OntologySelect;
