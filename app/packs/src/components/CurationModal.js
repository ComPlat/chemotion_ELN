import React, { Component , useState} from 'react';
import { Grid,Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger,Overlay, Panel, Alert,Col, Row, ControlLabel} from 'react-bootstrap';
import PropTypes, { array } from 'prop-types';
import AutomticCurationFetcher from 'src/fetchers/AutomaticCurationFetcher.js';


export default class CurationModal extends Component {
    constructor(props) {
      var Typo = require("typo-js");
      super(props);
      this.handleShow = this.handleShow.bind(this);
      this.handleClose = this.handleClose.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.changeCorectWord = this.changeCorectWord.bind(this)
      this.handleSuggestChange = this.handleSuggestChange.bind(this)
      this.handleDictionaryLang = this.handleDictionaryLang.bind(this)
      this.handlePromptDismiss = this.handlePromptDismiss.bind(this);
      this.handlePromptShow = this.handlePromptShow.bind(this);
      this.convertStringToObject = this.convertStringToObject.bind(this);
      this.updateDescription = this.updateDescription.bind(this)
      this.scrollToId = this.scrollToId.bind(this)
      this.state = {
        desc : this.cleanData(this.props.description), // description text is stored here
        show : false,  // variable for show modal
        mispelledWords : [], // array with misspelled words
        correctedWords: [], // array with words that have been corrected
        suggestion : [], // aray that contains the sugestions from selected word
        suggestionIndex : 0, //int that determines what entry from misspelled words state suggestions are generated
        correctWord : "", //string that contains word after correction 
        subscriptList : [], // array that contains each word that needs to have subscript applied
        dictionaryLanguage: "US", //string that determines what version of english is selected
        showPrompt : false, // booloon that determines if new word prompts shows
        descriptionObject : {}, // object that contains description and formatting properties
        cus_dictionary : new Typo("custom", false, false, { dictionaryPath: "/typojs" }), // dictionary object for custom dictionary
        uk_dictionary : new Typo("en_UK", false, false, { dictionaryPath: "/typojs" }), // dictionary object for EN UK dictionary
        us_dictionary : new Typo("en_US", false, false, { dictionaryPath: "/typojs" }),  // dictionary object for EN US dictionary
        showCorrectButton: true, // booloon that determines if correct button is disabled
        idKeyArray : [], //ID Key array that stores highlighter index used by the autoscroll
        showNewWordButton: true // booloon that determines if add new word button is disabled
    }}

  

    handlePromptDismiss() {
      this.setState({ showPrompt: false });
    }

    handlePromptShow() {
      this.setState({ showPrompt: true });
    }

    handleDictionaryLang(){
      (this.state.dictionaryLanguage === "US")
        ? this.setState({dictionaryLanguage: "UK"})
        : this.setState({dictionaryLanguage: "US"})
      this.spellCheck(this.state.desc)
    }

    updateDescription(){
      this.setState({desc: this.cleanData(this.props.description) }, (() => {this.spellCheck(this.state.desc );
        this.scrollToId()
      }))
    }

    convertStringToObject(input_string){  // function is used to convert description string into a description object
     
      var word_with_subscript = input_string.match(/\b[a-z]\w*\d[a-z]*/gi);
      var regex_string = '';
      var new_array = [];
      var output_object = new Object
      if (word_with_subscript != null){
      for (let i= 0; i< word_with_subscript.length; i++){
        if (i == word_with_subscript.length -1 ){
          regex_string = regex_string.concat(word_with_subscript[i]) ;
          }
        else
          regex_string = regex_string.concat(`${word_with_subscript[i]}|`)
      };}
      else{regex_string = "no match"}
      var regex_sub = new RegExp(`(${regex_string})` ,"g");
      new_array = input_string.split(regex_sub);
      for (let i = 0 ; i < new_array.length; i++){
        if (new_array[i].match(/\b[a-z]\w*\d[a-z]*/gi)){
          new_array[i] = new_array[i].split(/(\d)/g)
        }
      }
      new_array = new_array.flat()
      for (let i = 0 ; i < new_array.length; i++){
        if (new_array[i].match(/\d/) && new_array[i].length == 1){
          new_array[i] = {"attributes":{"script":"sub"}, "insert":new_array[i]}
        }
        else
          new_array[i] = {"insert": new_array[i]}
      };
      output_object = {"ops" : new_array}
      output_object["ops"] = output_object["ops"].filter((x)=> x["insert"] != "" )
      this.setState({descriptionObject:output_object},()=>{      
        this.props.onChange(this.state.descriptionObject);
                 });
      return output_object
    }

    handleSuggestChange(e){
      const new_word = e.target.value
      this.setState({correctWord:new_word})
    }

    advanceSuggestion(index,miss_spelled_words){
      var correctedArray = this.state.correctedWords
      if (index < miss_spelled_words.length ){
      index = index +1 }
      else {
        index = 0
      }
      correctedArray.push(miss_spelled_words[index - 1])
      this.handleSuggest(miss_spelled_words, index)
      this.setState( {suggestionIndex : index,
        correctedArray: correctedArray
      },()=>this.scrollToId() ) 
    }



    reverseSuggestion(input,miss_spelled_words){
      if (input < miss_spelled_words.length){
      input = input -1 }
      else {
        input = 0
      }
      this.handleSuggest(miss_spelled_words, input)
      this.setState( {suggestionIndex : input} ) 
    }

    handleClose() {
      this.setState({ show: false });
    }

    handleShow() {
      this.setState({ show: true }, this.updateDescription);
    }

    handleSuggest(miss_spelled_words, index){ //handles generating the suggestion list (Right now Typo js suggest feature is quite weak and it would be better if this was handled by the AI modal in the future)
      var Typo = require("typo-js");
      var dictionary = new Typo( "en_US", false, false, { dictionaryPath: "/typojs" }); // generates the en_US dictionary
      var mispelled_word = miss_spelled_words[index] // word from misspelled word array
     
      if (typeof mispelled_word === "string" )
      {  
        if (/(.)\1{4,}/.test(mispelled_word)) // detects if the word is a long string of the same character. This causes the suggestion to function to run for a long time and can lead to crashes
        {

          var repeatedCharacter = mispelled_word.match(/(.)\1{4,}/) 
          var newMisspeled = mispelled_word.replace(/(.)\1{4,}/, repeatedCharacter[0].charAt(0)  ) 
          var ms_suggestion = [newMisspeled]
        }
        else
        var ms_suggestion = dictionary.suggest(mispelled_word)
        this.setState({ suggestion : ms_suggestion}) 
      }   
      else {
        console.log("run spell check")
      }
    }

    useAllDicitonary(en_dictionary,custom_dictionary, word){ // function to use both Custom and English dictionarys to check word
      var is_word_correct = false ;
      if (en_dictionary.check(word)){
        is_word_correct = true}
      else { if(custom_dictionary.check(word)){
        is_word_correct = true
      }}
      return is_word_correct
    }

    checkSubScript(input_text){ // find instances that need subscript property applied to it Ex molecular formula
      if(/\b[a-z]\w*\d[a-z]*/gi.test(input_text)){
      var potential_mol_form = input_text.match(/\b[a-z]\w*\d[a-z]*/gi)
      var split_form = potential_mol_form[0].split(/(\d)/g) 
        // Clean off empty strings
        split_form = split_form.filter(n => n) 
        return split_form.map((part, index) => (
          <React.Fragment key={index}>
            {(split_form[index].match(/\d/))
              ? (<sub>{part}</sub>) 
              : (part)}
          </React.Fragment>
        )) 
    }}

    spellCheck(description){ // function takes description string and updates misspelled words state with misspellings
      if(description !== undefined){
        // var Typo = require("typo-js");
        // dictionary objects are called from state
        var cus_dictionary = this.state.cus_dictionary
        var  uk_dictionary = this.state.uk_dictionary
        var  us_dictionary = this.state.us_dictionary
        var ms_words = [];
        var ss_list = []
        var italics_array =[]
        var word_array = description.split(/\b/g) // word_array is the description split by word breaks 

        if (this.state.dictionaryLanguage === "UK"){ // if stament here determines what version of English is used
          var en_dictionary = uk_dictionary
          console.log("uk used")
        }
        else {
          var en_dictionary = us_dictionary
          console.log("us used")
        }
        for (let i = 0; i < word_array.length; i++){ // loops along each word in the word array
          word_array[i] = word_array[i].replace(/\[\d+\]/g, "") //removes citation brackets
          if (/\b[\p{Script=Latin}]+\b/giu.test(word_array[i])){ // tests if the word is in latin characters aka no numbers, this is done to account for accented characters
            if(word_array[i].includes("°") ){ // if the degree sign is used it defults to the word is spelled correctly
              var spell_checked_word = true
            }
            if(/\/.+\//gi.test(word_array[i])){ // tests looking for italics if true pushes the word to the ittalics array and marks the word as corrrect
             
              italics_array.push(word_array[i])
              var spell_checked_word = true
            }
            else{
              if(/[a-z]*\-[a-z]*/.test(word_array[i])) // hyphanted words are processed here currently it ignores words with hyphans
                {}
              else{
                if(/'/.test( word_array[i])){  // removes any leading quotation marks and returns the modified word
                  var sliceIndex = word_array[i].indexOf("\'")
                  word_array[i] = word_array[i].substring(0 ,sliceIndex) 
                }
                if(/—/.test(word_array[i])){ // if a hyphan is detected it splits them by the hyphan and enters both new words  to the word array
                  var sliceIndex = word_array[i].indexOf("—")
                  word_array[i] = word_array[i].substring(0,sliceIndex)
                  word_array.push(word_array[i].slice(sliceIndex))
                } 
                var spell_checked_word = this.useAllDicitonary(en_dictionary,cus_dictionary,word_array[i]); //  here the processed word string is then checked against the entries in the custom and UK or US dictionary
              }
          }}
          else
            {if(/\b[a-z]\w*\d[a-z]*/gi.test(word_array[i])) // this regex string is used to detect any words with numbers with the molecular forumula scheme
              {ss_list.push(word_array[i])}
            else{ // if not a molecular formula the word with a number in it is marked as correct and the next word is processed
              var spell_checked_word = true; }
            }
          if(spell_checked_word == false){ 
            // if the word is not found in either dictionarys spell_checked_word is set to false and the word is then pushed to the missspelled words array
            ms_words.push(word_array[i]);
    
          } 
        }
        ms_words = ms_words.filter((x)=> x != "" ) // any empty strings are filtered out of the array
        this.setState({mispelledWords: ms_words, subscriptList:ss_list}, ()=>{// the states are then set here
    
        })
        this.handleSuggest(ms_words, 0) // handled sugest is called to generate the list when spellCheck is run on opening the modal
        }
      else{}} // here is the return if the descritption input is undefined

    cleanMisspelledArray(input_array){ // removes empty values from misspelled words array
      const counts = {};
      input_array.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
      return counts
    }

    changeMisspelling(description,selected_choice,ms_words,index){ // function used to change misspelled word to correcct word choice
      if (selected_choice !== ""){
        var fixed_description = description.replace(ms_words[index], selected_choice);}
      else{
        var fixed_description = description}
          if (index < ms_words.length){
            index= index +1 }
          else {
            index = 0
      }
      var correctedWords = this.state.correctedWords
      correctedWords.push(ms_words[index - 1])
      this.setState({suggestionIndex : index, 
        desc :fixed_description,
        correctedWords: correctedWords});
      this.handleSuggest(ms_words, index);
      this.setState({correctWord: "", showCorrectButton: true})
    }

    removeSpaces(introarray){ // removes double spaces in description ** TOBE remove
      for(var entry of introarray){
        var index = introarray.indexOf(entry)
        introarray[index] = entry.replaceAll(" ","")
      }
      return introarray
    }

    getHighlightedText(text, mispelledWords,ms_index,subscriptList) { // renders description text with misspelled words hihlighted and subscript applied
      console.log(mispelledWords)
      var correctedArray = this.state.correctedWords
      var idArray = this.state.idKeyArray
      var idindex = 0
      for (var entry of mispelledWords){
        var index = mispelledWords.indexOf(entry)
        mispelledWords[index] = entry.replaceAll(" ","")
      }
      if(text !== undefined){
        var combined_array = mispelledWords.concat(subscriptList)
        for (var entry of combined_array){
          var index = combined_array.indexOf(entry)
          combined_array[index] = entry.replaceAll(" ","")
        }
        var highlight = combined_array.join("|")
        highlight = highlight.replaceAll(" ","")
        highlight = "\\b(" + highlight + ")\\b"
        var regexHighlight = new RegExp(highlight, )
        var parts = text.split(regexHighlight);
        var output_div
        parts.filter((x)=> x != "" )
        var list_items = parts.map((part, index) => (
          <React.Fragment key={index}>
            {(()=> 
            {
              var highlight_current = mispelledWords[ms_index]
              highlight_current = "\\b(" + highlight_current + ")\\b"
              var regexHighlightCurrent = new RegExp(highlight_current)
              var highlightWithOutCurrent = mispelledWords.toSpliced(ms_index, 1)
              highlightWithOutCurrent = highlightWithOutCurrent.join("|")
              highlightWithOutCurrent = "\\b(" + highlightWithOutCurrent + ")\\b"
              var regexHighlightWithOutCurrent = new RegExp(highlightWithOutCurrent)
              if(subscriptList.includes(part)){
                output_div =  this.checkSubScript(part)   
              }
              else if(regexHighlightCurrent.test(part) && !correctedArray.includes(part) )
                {
                  output_div = (<b id={idindex} style={{backgroundColor:"#32a852"}}>{part}</b>) 
                  idArray.push(idindex)
                  idindex = idindex + 1
                }
              else if(regexHighlightWithOutCurrent.test(part) && !correctedArray.includes(part) ) 
                {
                  output_div = (<b id={idindex} style={{backgroundColor:"#e8bb49"}}>{part}</b>)
                  idArray.push(idindex)
                  idindex = idindex + 1
                }
              else if(correctedArray.includes(part)){
                  output_div = <span id={idindex}> {part} </span>
                  idArray.push(idindex)
                  idindex = idindex + 1
                }
              }
              )
              ()
            }
           
          {combined_array.includes(part)
            ? (output_div)
            : (part)} 
        </React.Fragment>)
        )
        
        return (
          <div>
            {list_items}
          </div>
        );}
        // console.log(idArray)
        this.setState({idKeyArray: idArray})}

    uniq(a) { // removes duplicates in array
      var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];
      return a.filter(function(item) {
          var type = typeof item;
          if(type in prims)
              return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
          else
              return objs.indexOf(item) >= 0 ? false : objs.push(item);
      });
    }

    changeCorectWord(changeEvent) { 
      this.setState({correctWord: changeEvent.target.value,
        showCorrectButton:false
      }) 
    }

    changeNewWord() { //updates state for newword button
      this.setState({
        showNewWordButton:false
      }) 
    }

    cleanData(description){ //converts description object to string
      if (description !== undefined){
        var newDescription = ""
        if(typeof description === "string"){
          return description 
        }
        else if(typeof description.value == "object" && description.value.ops !== undefined){
          for (var element of description.value.ops){
            newDescription = newDescription + element.insert
          }
          return newDescription
        }

        else{
        const array_input = Object.values(description);
        let array_output =[];
        array_input.forEach((element) => {
            array_output = array_output.concat(element.insert);
        });
      
        const str_out = (array_output.join(""));
        return str_out;}}
      else  
      return
      // throw Error('data is not in correct format')
    }

    async amendUpdate(input){ //updates custom dictionary with user input word and reloads dictionary
      var Typo = require("typo-js");
      var uuid = require("uuid") 
      var uid = uuid.v4()
      Typo.prototype._readFile.path = Typo.prototype._readFile.path + `?t=` + uid	// addes random unique ID to xmlHttprequest for dictionary retrieval
      await AutomticCurationFetcher.amendFetch(input),
        this.setState({cus_dictionary: new Typo("custom",false,false,{ dictionaryPath: "/typojs" })})
    }

    scrollToId(){ // autoscrolls to incorrect word selection (slightly buggy if a misspelled word is repeated)
      var sugIndex = this.state.suggestionIndex
      var idArray = this.state.idKeyArray
      var querryselector = `#\\3${idArray[sugIndex]}`
      var element = document.querySelector(querryselector) 
      if(element !== null){
      element.scrollIntoView({behavior :"smooth", alignToTop: true})
    }
  }

    render() {
      var CustomPopover = () =>  ( // prompt to confirm if you want to send the word to the custom dictionary or remove the last entered
          <Grid className="customPopover">
            <Col md={3} style={{paddingLeft: 0, marginLeft: "-15px"}}>
              <h4><b>{this.state.correctWord} </b> added To dictionary
              </h4>
            </Col>
            <Col md={3}>
              <ButtonToolbar>
                <Button onClick={()=> {AutomticCurationFetcher.removeFetch(this.state.mispelledWords[this.state.suggestionIndex]) ;this.handlePromptDismiss()}}>Remove last entry</Button>
                <Button onClick={()=>{this.changeMisspelling(this.state.desc, this.state.correctWord, this.state.mispelledWords, this.state.suggestionIndex);this.handlePromptDismiss()}}>Next</Button>
              </ButtonToolbar> 
            </Col>
          </Grid>
        );
     
    
      const Compo = ({ text, mispelledWords,index ,subscriptList}) => { // componet that renders the highlighted description
        return <div>{this.getHighlightedText(text, mispelledWords,index, subscriptList )}</div>;
      };

      const SuggestBox = ({suggest_array, suggestionIndex}) =>{ // componet for loading the sugestion array
        if (suggestionIndex <  this.state.mispelledWords.length ){
          return suggest_array.map((suggestion,id) =>  (
            <div key={id}>
              <label> 
                <input type="radio" value= {suggestion} onChange={this.changeCorectWord} checked={this.state.correctWord === suggestion} style={{marginRight:5}}/>
                {suggestion}
                </label> 
             </div>  
        ));}
        else if (suggestionIndex >= this.state.mispelledWords.length ){
        return(
        <div>
          <h5>No corrections detected</h5>
        </div>)}
        else{
          return (
            <div>
              <h5>None</h5>
            </div>
          )
        }
      };

      const DictionaryButton = ({state})=>{ // add to dictionary componet if button is clicked form and button are changed to a confirmation prompt called CustomPopover
        if (state == true){
          return(<></>)
        }
        else{
          return(
            <Button 
            bsStyle="success" 
            disabled={this.state.showNewWordButton}
            onClick= {() => { 
            this.amendUpdate(this.state.correctWord); this.handlePromptShow()
            }}>
                add to dictionary {state}
            </Button>
      )}}

      let formWindow;
        if(this.state.showPrompt == false){
          formWindow =  
          <form>
            <FormControl
              type="text"
              value={this.state.value}
              placeholder="Enter text"
              onChange={() => {this.handleSuggestChange; this.changeNewWord}}
              maxLength={30}
              /> 
          </form>;
        }
        else{
          formWindow = <CustomPopover></CustomPopover>;
        }

      return (
        <span>
          <Button  onClick={() => {this.handleShow()}} style={{float:"none"}}  // spell check button
          id={this.props.ref}>
            <span  title="Curate Data" className="glyphicon glyphicon-check" style={{color: "#369b1e"}}/>
          </Button>
    
          <Modal show={this.state.show} onHide={this.handleClose} onEntered={this.scrollToId} onExit={this.props.onExit}>
            <Modal.Header closeButton>
              <Modal.Title>
                <Col md={6}><span style={{paddingRight:10}}>Spell Check: English {this.state.dictionaryLanguage}   </span>
                  <Button onClick={()=> this.handleDictionaryLang()}><i class="fa fa-language" ></i>
                  </Button>
                </Col>
              </Modal.Title> 
            </Modal.Header>
            <Modal.Body>
              <Panel >
                <Panel.Heading>
                <Grid >
                  <Row style={{paddingTop:5}}>
                    <Col md={3} sm={3} style={{paddingLeft:0}} > {formWindow}</Col>
                    <Col md={2} style={{paddingLeft:0}}> <DictionaryButton state={this.state.showPrompt}></DictionaryButton></Col>
                  </Row>
                </Grid>
                </Panel.Heading>
                <Panel.Body style={{overflowY:"scroll",height:300}}>
                  <Compo text={this.state.desc} 
                    mispelledWords={this.state.mispelledWords} 
                    index={this.state.suggestionIndex} 
                    subscriptList={this.state.subscriptList} /> 
                </Panel.Body> 
                <Panel>
                  <Panel.Heading>
                  <Row>
                  <Col md={7}>
                 <h5> Suggestions for : <b>{this.state.mispelledWords[this.state.suggestionIndex]}
                  </b>  </h5></Col><Col md={5}><Button onClick={()=> {this.amendUpdate(this.state.mispelledWords[this.state.suggestionIndex]);this.advanceSuggestion(this.state.suggestionIndex,this.state.mispelledWords)}}>Add Selected Word
                    </Button></Col>
                    </Row>
                  </Panel.Heading>
                  <Panel.Body>
                    <Col md={6}>
                      <SuggestBox suggest_array={this.state.suggestion} suggestionIndex={this.state.suggestionIndex}></SuggestBox>
                    </Col>
                    <Col md={6}>
                    </Col>
                  </Panel.Body>
              <Panel.Footer><ButtonToolbar>
              {/* <Button onClick={this.scrollToId}></Button> */}
                <Button onClick={()=>{this.advanceSuggestion(this.state.suggestionIndex,this.state.mispelledWords); this.scrollToId()}}>Ignore</Button>
                <Button onClick={()=>this.reverseSuggestion(this.state.suggestionIndex,this.state.mispelledWords)}>Go Back</Button>
                <Button onClick={()=>
                  {this.changeMisspelling(this.state.desc, this.state.correctWord, this.state.mispelledWords, this.state.suggestionIndex);
                  this.convertStringToObject(this.state.desc)
                  this.scrollToId()}}
                  disabled={this.state.showCorrectButton}>
                  Correct
                </Button>
                {/* <Button onClick={()=> this.convertStringToObject(this.state.desc)}>convert string</Button> */}
                {/* save issue is here */}
                <div className='pull-right'><Button onClick={()=> {
                  this.convertStringToObject(this.state.desc); 
                  this.handleClose()
                  }}> 
                  <i class="fa fa-floppy-o"></i> </Button>
                </div>
              </ButtonToolbar> 
              </Panel.Footer>
            </Panel>
        </Panel>
    </Modal.Body>
  </Modal>
</span>
      );
    }
  }

CurationModal.propTypes = {
    reaction: PropTypes.object,
    onChange: PropTypes.func,
    ref: PropTypes.string,
    onExit : PropTypes.func
  };
  
