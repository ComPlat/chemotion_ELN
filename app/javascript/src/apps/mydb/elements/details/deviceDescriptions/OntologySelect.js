import React, { useState, useEffect } from 'react';
import { AsyncSelect } from 'src/components/common/Select';
import { Badge } from 'react-bootstrap';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const OntologySelect = (props) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const deviceDescription = deviceDescriptionsStore.device_description;

  const constructOption = (data) => {
    if (data) {
      const desc = data.description?.join('') || '';
      return {
        value: data.id,
        label: (
          <div className="d-flex justify-content-between flex-wrap">
            <div>{data.label}</div>
            <div className="ms-auto">
              <Badge bg="primary" className="me-1">
                {data.short_form}
              </Badge>
              <Badge bg="info">
                {data.ontology_prefix}
              </Badge>
            </div>
            {desc && (
              <div className="w-100 mt-1" style={{ fontSize: '11px' }}>{desc}</div>
            )}
          </div>
        ),
      };
    }
    return data;
  };

}

export default OntologySelect;
