import React, { Component , useState, useEffect} from 'react';
import { Grid,Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger,Overlay, Panel, Alert,Col, Row, ControlLabel} from 'react-bootstrap';
import { read, utils, writeFile } from 'xlsx';
import AutomticCurationFetcher from 'src/fetchers/AutomaticCurationFetcher.js';
import CurationModal from '../components/CurationModal';

export default class BatchCuration extends Component {
    constructor(props) {
        super(props);
        this.readPubRxDesc= this.readPubRxDesc.bind(this);
        this.handleEntries = this.handleEntries.bind(this);
        this.handleAdvSelection = this.handleAdvSelection.bind(this);
        this.handleRevSelection = this.handleRevSelection.bind(this);
        this.state = {
            descArray:[],
            selectionIndex: 0,
            selectionData : ""
    }}

    componentDidMount(){
        this.readPubRxDesc()  
    }

    readPubRxDesc(){  
    var xlxsPromise = AutomticCurationFetcher.fetchBatchData();
    xlxsPromise.then((value) => {this.setState({descArray: value}, ()=> this.handleEntries()) });
    }

    handleEntries(){
        this.setState({selectionData: this.state.descArray[this.state.selectionIndex].plain_text_description
        });
    }

    handleAdvSelection(){
        if(this.state.selectionIndex != this.state.descArray.length)
        {var selectionIndex = this.state.selectionIndex + 1;
        this.setState({selectionIndex: selectionIndex},()=> this.handleEntries());};
    }

    handleRevSelection(){
        if(this.state.selectionIndex != 0)
            {var selectionIndex = this.state.selectionIndex - 1;
        this.setState({selectionIndex: selectionIndex}, ()=> this.handleEntries());}
    }

    handleChange(event){
        var newDescArray = this.state.descArray;
        console.log(event.ops);
        var newSelectedEntry ="";
        for (var segment of event.ops ){
            segment  = segment.insert;
            newSelectedEntry = newSelectedEntry + segment;
        }
        newDescArray[this.state.selectionIndex].plain_text_description = newSelectedEntry;
        this.setState({descArray: newDescArray } )
    }

    render(){
        return(<>
        <Button onClick={this.handleAdvSelection}>press here to advance selection</Button>
        <Button onClick={this.handleRevSelection}>press here to reverse selection</Button>
        <CurationModal 
                description= {this.state.selectionData} 
                onChange = {( event) => this.handleChange(event)}
                ref = {this.reactQuillRef}
                onExit = {this.handleEntries}
                />
        <div>{this.state.selectionIndex}</div>
        <div>{this.state.selectionData}</div>
        </>
        )
    }
}
