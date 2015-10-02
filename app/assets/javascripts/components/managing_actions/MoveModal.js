import React from 'react';
import Select from 'react-select';

import ElementActions from '../actions/ElementActions';
import CollectionManagementModal from './CollectionManagementModal';

export default class MoveModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <CollectionManagementModal 
        action={ElementActions.updateElementsCollection}
        modal_title={"Move to Collection"}
        show_collections={true}
      />
    )
  }
}
