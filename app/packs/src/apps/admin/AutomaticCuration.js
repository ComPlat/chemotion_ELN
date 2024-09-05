import React, { Component, useEffect} from 'react';
import { Grid, Row, Col, Nav, NavItem , Button, Form, FormGroup,ControlLabel,FormControl,HelpBlock} from 'react-bootstrap';
import { a, search } from 'react-dom-factories';
import Dropzone from 'react-dropzone';
import AutomticCurationFetcher from 'src/fetchers/AutomaticCurationFetcher.js';
import BatchCuration from '../../utilities/BatchCuration';

export default class DictionaryCuration extends Component  {
    constructor(props) {
        super(props);
        this.saveFile = this.saveFile.bind(this)
        this.handleChangeCustom = this.handleChangeCustom.bind(this);
        this.handleChangeEstablished = this.handleChangeEstablished.bind(this);
        this.handleChangeCustomSearch = this.handleChangeCustomSearch.bind(this)
        this.handleChangeEstablishedSearch = this.handleChangeEstablishedSearch.bind(this)
        this.checkCvEstDictionary= this.checkCvEstDictionary.bind(this)
        this.state = {
            customValue: '',
            establishedValue:"",
            file: null,
            customSearch: "",
            establishedSearch :"",
            affObject : null,
            establishedDictionaryText :"",
            customDictionaryText: "",
            loading :false,
            estMain: "",
            cusMain: ""
            
        }}
    
    async componentDidMount(){
      var initTime = new Date();
      console.log(`start: ${initTime}`)
      const customDictionaryText= AutomticCurationFetcher.dictionaryFetch("custom", "custom.dic")
      const cusMain= AutomticCurationFetcher.dictionaryFetch("custom", "custom.dic")
      const establishedDictionaryText = AutomticCurationFetcher.dictionaryFetch("en_US", "en_US.dic")
      const affixText = AutomticCurationFetcher.dictionaryFetch("en_US", "en_US.aff")
      const estMain = AutomticCurationFetcher.dictionaryFetch("en_US", "en_US.dic")
      const [new_customDictionaryText, new_establishedDictionaryText, new_affixText , new_estMain, new_cusMain] = await Promise.all([customDictionaryText,establishedDictionaryText,affixText,estMain, cusMain])
      console.log(`fetch done: ${Date.now() - initTime}`)
      // var affObject = this.convertAffxStrtoObj(new_affixText)
      console.log(`aff converted done: ${Date.now() - initTime}`)
      this.setState({
        establishedValue : new_establishedDictionaryText,
        establishedDictionaryText : new_establishedDictionaryText,
        customValue : new_customDictionaryText,
        customDictionaryText : new_customDictionaryText,
        affObject: {},
        loading : true,
        estMain: new_estMain,
        cusMain: new_cusMain
        }
        ,
      //   ()=>{this.applyAffix(); console.log(`aff done: ${Date.now() - initTime}`)}
      ); 
        this.fileDisplay()  
    }
    useDictionary(word){
      var Typo = require("typo-js");
      var us_dictionary = new Typo("en_US", false, false, { dictionaryPath: "/typojs" });
      var is_word_correct = us_dictionary.check(word)
      return is_word_correct
      }
 
    handleSearchSubmit(DictionaryText,search,valueState){
      var dictionaryArray = DictionaryText.split("\n")
      var searchTerm = search
      var count = []
      var newDictString =""
      for (var dictEntry of dictionaryArray){
        if (dictEntry.includes(searchTerm)){
          count.push(dictionaryArray.indexOf(dictEntry))
        }
      }
      for (var countValue of count){
        newDictString = newDictString + dictionaryArray[countValue] + "\n"
      }
      this.setState({[valueState]: newDictString})
    }

    saveFile(){
      var new_dic = this.state.customValue
      new_dic = encodeURIComponent(new_dic)
      console.log(new_dic)
      AutomticCurationFetcher.saveFetch(new_dic)
    }

    handleChangeCustom(e) {
      this.setState({ customValue: e.target.value });
    }
    
    handleChangeEstablished(e) {
      this.setState({ establishedValue: e.target.value });
    }

    handleChangeCustomSearch(e) {
      var dictionaryArray = this.state.cusMain.split("\n")
      var searchTerm = e.target.value
      var count = []
      var newDictString =""
      for (var dictEntry of dictionaryArray){
        if (dictEntry.includes(searchTerm)){
          count.push(dictionaryArray.indexOf(dictEntry))
        }
      }
      for (var countValue of count){
        newDictString = newDictString + dictionaryArray[countValue] + "\n"
      }
      this.setState({customValue: newDictString})
      }

    handleChangeEstablishedSearch(e) {
      var dictionaryArray = this.state.estMain.split("\n")
      var searchTerm = e.target.value
      var count = []
      var newDictString =""
      if(searchTerm.length > 1){
      for (var dictEntry of dictionaryArray){
        if (dictEntry.includes(searchTerm)){
          count.push(dictionaryArray.indexOf(dictEntry))
        }
      }
      for (var countValue of count){
        newDictString = newDictString + dictionaryArray[countValue] + "\n"
      }
      this.setState({establishedValue: newDictString})
      this.setState({ establishedSearch: e.target.value });
    }}

    handleFileDrop(attach) {
        this.setState({ file: attach[0] });
    }

    handleAttachmentRemove() {
        this.setState({ file: null });
    }

    // checkCustomVsEstablished(custom,established){
    //   var customArray = custom.split("\n")
    //   var establishedArray = established.split("\n")
    //   var newCustomArray = customArray.filter(val => !establishedArray.includes(val));
    //   var removed_entries = customArray.filter(val => establishedArray.includes(val))
    //   console.log(removed_entries)
    //   console.log("finished checking")
    //   this.setState({customValue: newCustomArray.join("\n")})
    // }

    checkCvEstDictionary(custom){
      var Typo = require("typo-js");
        var us_dictionary = new Typo("en_US", false, false, { dictionaryPath: "/typojs" });
      var customArray = custom.split("\n")
      for (var customEntry of customArray){
        var is_word_correct = us_dictionary.check(customEntry)
        if (is_word_correct == true){
          var customArray = customArray.filter(e => e !== customEntry)
        }
      }
      this.setState({customValue: customArray.join("\n")})
    }

    creatDictionaryFromString(){
      var input = 'The Tetrarchy was the administrative division of the Roman Empire instituted by Roman emperor Diocletian in 293 AD, marking the end of the Crisis of the Third Century and the recovery of the Roman Empire. The first phase, sometimes referred to as the Diarchy ("the rule of two"), involved the designation of the general Maximian as co-emperor firstly as Caesar (junior emperor) in 285, followed by his promotion to Augustus in 286. Diocletian took care of matters in the Eastern regions of the Empire while Maximian similarly took charge of the Western regions. In 293, feeling more focus was needed on both civic and military problems, Diocletian, with Maximian\'s consent, expanded the imperial college by appointing two Caesars (one responsible to each Augustus) Galerius and Constantius Chlorus. '
      // input = input.replaceAll(/\d/g, "")
      input = input.replaceAll(" ", "\n")
      input = input.replaceAll(/[\.\,\?\!\(\) \"\d]/g, "")
      input = input.toLowerCase()
      console.log(input)
    }

    dropzoneOrfilePreview() {
        const { file } = this.state;
        return file ? (
          <div>
            {file.name}
            <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
              <i className="fa fa-trash-o" />
            </Button>
          </div>
        ) : (
          <Dropzone
            onDrop={attach => this.handleFileDrop(attach)}
            style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
            // accept ={".dic"}
            >
            <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
              Drop File, or Click to Select.
            </div>
          </Dropzone>
        );
      }

    fileDisplay(){
      if (this.state.file !== null){
        this.state.file.text().then((text) =>this.setState({customValue :text}))
      }
    }

    loading(){
      if (this.state.loading == true){
      return (
        <div>
        affix loading
        </div>)}
      else
      return (<></>)
      
    }
    
    render() {
        return(
        <div>
            {this.dropzoneOrfilePreview()}
            <Button onClick={()=> this.checkCvEstDictionary(this.state.customValue)}>Check Custom Dictionary</Button>
            <Button onClick={()=> this.saveFile()}>Save dictionary</Button>
            <BatchCuration></BatchCuration>
            {/* <Button onClick={()=> this.applyAffix()}>load affix</Button> */}
            {/* <Button onClick={()=> this.creatDictionaryFromString()}>Create dictionary</Button> */}
            <Row>
              <Col lg={6}>
             
                  <FormGroup controlId="customDictionary">
                      <ControlLabel>Custom Dictionary
                        <Row>
                          <Col lg={6}>
                            <FormControl
                              type="text"
                              placeholder="Enter Search"
                              onChange={this.handleChangeCustomSearch}/>
                          </Col>
                          <Col lg={5}> 
                            <Button type='submit' onClick={()=> 
                              this.handleSearchSubmit(this.state.customDictionaryText,this.state.customSearch,"customValue")}>
                              Submit
                            </Button>
                          </Col>
                        </Row>
                      </ControlLabel>
                      <FormControl
                        componentClass="textarea"
                        value={this.state.customValue}
                        onChange={this.handleChangeCustom}
                        style={{width: 500, height: 600}}
                      />
                      <FormControl.Feedback />
                  </FormGroup>
                  </Col>
                  <Col lg={6}>
                  <FormGroup controlId="establishedDictionary">
                      <ControlLabel>Established Dictionary
                        <Row>
                          <Col lg={6}>
                            <FormControl
                              type="text"
                              // value={this.state.value}
                              placeholder="Enter Search"
                              onChange={this.handleChangeEstablishedSearch}/>
                          </Col>
                          <Col lg={5}> 
                            <Button type='submit' onClick={()=> 
                              this.handleSearchSubmit
                              (this.state.establishedDictionaryText,this.state.establishedSearch,"establishedValue")}>
                              Submit
                            </Button>
                          </Col>
                        </Row>
                        </ControlLabel>
                      <FormControl
                          componentClass="textarea"
                          value={this.state.establishedValue}
                          onChange={this.handleChangeEstablished}
                          style={{width: 500, height: 600}}
                      />
                      <FormControl.Feedback />
                  </FormGroup>
                 
                  </Col>
                </Row>
            </div>
        )
    }   
}
