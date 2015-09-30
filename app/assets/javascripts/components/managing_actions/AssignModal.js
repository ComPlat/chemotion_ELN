import React from 'react';
import Select from 'react-select';

import CollectionActions from '../actions/CollectionActions';
import CollectionManagementModal from './CollectionManagementModal';

export default class AssignModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <CollectionManagementModal 
        action={CollectionActions.assignElementsCollection}
        modal_title={"Assign to Collection"}
      />
    )
  }
}
