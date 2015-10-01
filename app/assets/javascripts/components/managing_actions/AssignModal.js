import React from 'react';
import Select from 'react-select';

import ElementActions from '../actions/ElementActions';
import CollectionManagementModal from './CollectionManagementModal';

export default class AssignModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <CollectionManagementModal 
        action={ElementActions.assignElementsCollection}
        modal_title={"Assign to Collection"}
        show_collections={true}
      />
    )
  }
}
