import React from 'react';
import {Button} from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from '../stores/UIStore';
import CollectionStore from '../stores/CollectionStore';

export default class ExportButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Button href={"api/v1/reports/excel?id=" + UIStore.getState().currentCollectionId}>
                Export Collection
            </Button>
        )
    }
}
