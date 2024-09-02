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
    var xlxsPromise = AutomticCurationFetcher.fetchBatchData()
    xlxsPromise.then((value)=> {this.setState({descArray: value}, ()=> this.handleEntries()) });
    }

    handleEntries(){
        console.log(this.state.descArray)
        console.log(this.state.selectionIndex)
        this.setState({selectionData: this.state.descArray[this.state.selectionIndex].plain_text_description

        },()=> console.log(this.state.selectionData))
    }

    handleAdvSelection(){
        var selectionIndex = this.state.selectionIndex + 1
        
        this.setState({selectionIndex: selectionIndex},()=> this.handleEntries())
    }

    handleRevSelection(){
        var selectionIndex = this.state.selectionIndex - 1
        this.setState({selectionIndex: selectionIndex}, ()=> this.handleEntries())
    }

    render(){
        return(<>
        <Button onClick={this.handleAdvSelection}>press here to advance selection</Button>
        <Button onClick={this.handleRevSelection}>press here to reverse selection</Button>
        <CurationModal 
                description= {this.state.selectionData} 
                // onChange = {( event) => this.handleEntries(event)}
                ref = {this.reactQuillRef}
                />
        <div>{this.state.selectionIndex}</div>
        <div>{this.state.selectionData}</div>
        </>
        )
    }
}
