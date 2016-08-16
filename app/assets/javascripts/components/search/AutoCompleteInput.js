import React from 'react';
import ReactDOM from 'react-dom';
import {FormGroup,InputGroup,FormControl, Overlay, ListGroup, ListGroupItem}
  from 'react-bootstrap';
import debounce from 'es6-promise-debounce';

export default class AutoCompleteInput extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      value: '',
      valueBeforeFocus: null,
      showSuggestions: false,
      suggestions: null,
      suggestionFocus: null,
      error: '',
      inputWidth: 0,
      inputDisabled: false,
      timeoutReference: null,
    }
    this.timeout = 6e2 // 600ms timeout for input typing
    this.doneTyping = this.doneTyping.bind(this)
  }

  componentDidMount() {
    this.initInputWidth()
  }

  initInputWidth() {
    let input = ReactDOM.findDOMNode(this.refs.input)
    if (input) {
      this.setState({ inputWidth: input.offsetWidth })
    }
  }

  getNextSuggestionIndex() {
    let {suggestions, suggestionFocus} = this.state
    let result
    let nextSuggestionIndex = suggestionFocus + 1
    if(suggestions[nextSuggestionIndex]) {
      result = nextSuggestionIndex
    } else {
      result = 0 // previous suggestion was first in list, so use last one
    }
    return result
  }

  getPreviousSuggestionIndex() {
    let {suggestions, suggestionFocus} = this.state
    let result
    let previousSuggestionIndex = suggestionFocus - 1
    if(suggestions[previousSuggestionIndex]) {
      result = previousSuggestionIndex
    } else {
      // previous suggestion was first in list, so use last one
      result = suggestions.length - 1
    }
    return result
  }

  focusSuggestionUsingKeyboard(direction) {
    let suggestionFocus
    if(direction == 'up') {
      suggestionFocus = this.getPreviousSuggestionIndex()
    } else if(direction == 'down') {
      suggestionFocus = this.getNextSuggestionIndex()
    }

    this.focusSuggestion(suggestionFocus)
    this.setState({suggestionFocus: suggestionFocus})
  }

  focusSuggestion(newFocus) {
    let {suggestions, suggestionFocus, value, valueBeforeFocus} = this.state
    let newState = {}
    if(!valueBeforeFocus) {
      newState.valueBeforeFocus = value
    }
    newState.value = suggestions[newFocus].name
    newState.suggestionFocus = newFocus
    ReactDOM.findDOMNode(this.refs['suggestion_' + suggestionFocus])
            .classList.remove('active')
    let newFocusDom = ReactDOM.findDOMNode(this.refs['suggestion_' + newFocus])
    newFocusDom.classList.add('active')

    this.setState(newState)
    let listSuggestions = ReactDOM.findDOMNode(this.refs.listSuggestions)

    // Scroll to element
    if (listSuggestions &&
        (newFocusDom.offsetTop > (listSuggestions.scrollTop + listSuggestions.offsetHeight - 70) ||
        (newFocusDom.offsetTop < listSuggestions.scrollTop))) {
      listSuggestions.scrollTop = newFocusDom.offsetTop - (11 * listSuggestions.offsetTop);
    }
  }

  resetComponent() {
    this.setState({
      value: '',
      valueBeforeFocus: null,
      showSuggestions: false,
      suggestions: null,
      suggestionFocus: null,
      error: ''
    })
  }

  // TODO implement continue fetching in the end of scroll
  fetchSuggestions(value, show = true) {
    let debounced = debounce(this.props.suggestions, 200)
    debounced(value).then(result => {
      let newState = {}
      if(result.length > 0) {
        newState.suggestions = result
        newState.suggestionFocus = result.length - 1
        newState.showSuggestions = show
      } else {
        newState.suggestions = null
        newState.error = "Nothing was found."
        newState.suggestionFocus = null
        newState.showSuggestions = false
      }
      this.setState(newState)
    }).catch(error => console.log(error))
  }

  doneTyping() {
    let {value} = this.state
    if(!value) {
      this.resetComponent()
    } else {
      // From https://gist.github.com/lsauer/1312860
      // TODO Validate if the input is InChi, InChiKey or SMILES
      this.fetchSuggestions(value)
    }
  }

  // Keep chaging the input value until user finish typing
  handleValueChange(event, doneTyping) {
    let {value} = event.target
    let {timeoutReference} = this.state

    if(!value) {
      this.resetComponent()
    } else {
      if (timeoutReference) {
        clearTimeout(timeoutReference)
      }

      this.setState({
        value: value,
        timeoutReference: setTimeout(function(){
                                      doneTyping()
                                    }, this.timeout)
      })
    }
  }

  handleKeyDown(event) {
    let {value, valueBeforeFocus, showSuggestions, error, suggestions} =
      this.state
    let {onSelectionChange} = this.props
    let newState = {}
    switch(event.keyCode) {
      case 13: // Enter
        this.selectSuggestion()
        event.preventDefault()
        break
      case 27: // ESC
        this.abortAutoSelection()
        event.preventDefault()
        break
      case 38: // Up
        if(showSuggestions && !error) {
          this.focusSuggestionUsingKeyboard('up')
        }
        event.preventDefault()
        break
      case 40: // Down
        if(showSuggestions && !error) {
          this.focusSuggestionUsingKeyboard('down')
        } else if(suggestions) {
          newState.showSuggestions = true
        }
        event.preventDefault()
        break
    }
    this.setState(newState)
  }

  selectSuggestion() {
    let {suggestions, suggestionFocus, timeoutReference, value} = this.state
    let {onSelectionChange} = this.props
    this.setState({
      showSuggestions: false,
      valueBeforeFocus: null
    })

    let selection = {name: this.state.value, search_by_method: 'substring'}
    if (suggestions && suggestionFocus && suggestions[suggestionFocus] &&
      suggestions[suggestionFocus].name && this.state.value == suggestions[suggestionFocus].name) {
      selection = suggestions[suggestionFocus]
    }

    clearTimeout(timeoutReference)
    onSelectionChange(selection)    
  }

  abortAutoSelection() {
    let {valueBeforeFocus} = this.state
    this.setState({
      showSuggestions: false,
      value: valueBeforeFocus,
      valueBeforeFocus: null,
      suggestionFocus: null
    })
  }

  renderSuggestions() {
    let {suggestions, error} = this.state
    let types = {
      sample_name       : {icon: 'icon-sample'   , label: 'Sample'          },
      sample_short_label: {icon: 'icon-sample'   , label: 'Sample Label'    },
      polymer_type      : {icon: 'icon-polymer'  , label: 'Polymer'         },
      reaction_name     : {icon: 'icon-reaction' , label: 'Reaction'        },
      wellplate_name    : {icon: 'icon-wellplate', label: 'Wellplate'       },
      screen_name       : {icon: 'icon-screen'   , label: 'Screen'          },
      iupac_name        : {icon: 'icon-sample'   , label: 'Molecule'        },
      inchistring       : {icon: 'icon-sample'   , label: 'InChI'           },
      cano_smiles       : {icon: 'icon-sample'   , label: 'Canonical Smiles'},
      sum_formula       : {icon: 'icon-sample'   , label: 'Sum Formula'     },
      requirements      : {icon: 'icon-screen'   , label: 'Requirement'     },
      conditions        : {icon: 'icon-screen'   , label: 'Condition'       },
    }
    if(suggestions) {
      return (
        <div>
          { suggestions.map((suggestion, index) => {
            let suggestionType = types[suggestion.search_by_method]
            let icon = suggestionType ? suggestionType.icon : ""
            let typeLabel = suggestionType ? suggestionType.label : ""

            // Remove first "InchI" string in suggestion list
            let inchiString = 'InChI='
            let inchiMatch = suggestion.name.substring(0, inchiString.length)

            if (inchiMatch==inchiString) {
              suggestion.name = suggestion.name.replace(inchiString, "")
            }

            return (
              <ListGroupItem
                onClick={() => this.selectSuggestion()}
                onMouseEnter={() => this.focusSuggestion(index)}
                key={'suggestion_' + index}
                ref={'suggestion_' + index}
                header={suggestion.name}
              >
                <i className={icon} style={{marginRight: 2}}></i>
                {typeLabel}
              </ListGroupItem>
            )
          })}
        </div>
      )
    } else if(error) {
      return <ListGroupItem>{error}</ListGroupItem>
    } else {
      return (
        <div></div>
      )
    }
  }

  render() {
    let {value, showSuggestions, inputWidth, suggestions} = this.state
    if (suggestions && suggestions.length > 6)// show scroll after 6 results
      this.props.suggestionsAttributes.className = 'scroll'
    else
      this.props.suggestionsAttributes.className = ''// hide scroll

    let containerStyle = {
      position: 'absolute',
      width: inputWidth,
      marginTop: -15,
      marginLeft: 0,
      zIndex: 2
    }

    return (
      <div>
        <FormGroup>
          <InputGroup>
            <InputGroup.Button>
              {this.props.buttonBefore}
            </InputGroup.Button>
            <FormControl {...this.props.inputAttributes}
              disabled = {this.state.inputDisabled}
              type='text'
              value={value || ''}
              autoComplete='off'
              ref='input'
              onChange={event => this.handleValueChange(event, this.doneTyping)}
              onKeyDown={event => this.handleKeyDown(event)}
            />
            <InputGroup.Button>
              {this.props.buttonAfter}
            </InputGroup.Button>
          </InputGroup>
          <Overlay
            show={showSuggestions}
            onHide={() => this.abortAutoSelection()}
            placement='bottom'
            container={this}
            rootClose={true}>
            <div style={containerStyle}>
              <ListGroup {...this.props.suggestionsAttributes}
                          ref='listSuggestions'>
                {this.renderSuggestions()}
              </ListGroup>
            </div>
          </Overlay>
        </FormGroup>
      </div>
    )
  }
}
