import React, {Component} from 'react';
import { Table, Button, FormGroup } from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';
import { elementShowOrNew } from './routesUtils';

import ElementActions from './actions/ElementActions'
import SampleInlineHead from './SampleInlineHead'
import SampleInlineProperties from './SampleInlineProperties'
import ReactionInlineHead from './ReactionInlineHead'
import ReactionInlineProperties from './ReactionInlineProperties'
import WellplateInlineHead from './WellplateInlineHead'
import WellplateInlineProperties from './WellplateInlineProperties'
import ScreenInlineHead from './ScreenInlineHead'
import ScreenInlineProperties from './ScreenInlineProperties'


export default class ElementsTableInlineEditEntries extends Component {
  constructor(props) {
    super(props)

    this.showDetails = this.showDetails.bind(this)
    this.handleCopy = this.handleCopy.bind(this)
    this.handleSave = this.handleSave.bind(this)
  }

  showDetails(element) {
    // copied from ElementsTableEntries
    const { currentCollection, isSync } = UIStore.getState();
    const { id, type } = element;
    const uri = isSync
      ? `/scollection/${currentCollection.id}/${type}/${id}`
      : `/collection/${currentCollection.id}/${type}/${id}`;
    Aviator.navigate(uri, { silent: true });
    const e = { type, params: { collectionID: currentCollection.id } };
    e.params[`${type}ID`] = id;

    const genericEls = (UserStore.getState() && UserStore.getState().genericEls) || [];
    if (genericEls.find(el => el.name == type)) {
      e.klassType = 'GenericEl';
    }

    elementShowOrNew(e)
  }

  handleSave(event, elements, type) {
    event.preventDefault();

    const closeView = true, refreshElements = true

    if (type == 'sample') {
      elements.map(sample => {
        if (sample.isValid) {
          if (sample.isNew) {
            ElementActions.createSample(sample, closeView, refreshElements)
            ElementActions.changeElementProperty(sample, 'is_new', false)
          } else {
            sample.cleanBoilingMelting();
            ElementActions.updateSample(sample, closeView, refreshElements)
          }
        }
      })
    } else if (type == 'reaction') {
      elements.map(reaction => {
        if (reaction.isNew) {
          ElementActions.createReaction(reaction, closeView, refreshElements)
          ElementActions.changeElementProperty(reaction, 'is_new', false)
        } else {
          ElementActions.updateReaction(reaction, closeView, refreshElements)
        }
      })
    } else if (type == 'wellplate') {
      elements.map(wellplate => {
        if (wellplate.isNew) {
          ElementActions.createWellplate(wellplate.serialize(), closeView, refreshElements)
          ElementActions.changeElementProperty(wellplate, 'is_new', false)
        } else {
          ElementActions.updateWellplate(wellplate, closeView, refreshElements)
        }
      })
    } else if (type == 'screen') {
      elements.map(screen => {
        if(screen.isNew) {
          ElementActions.createScreen(screen, closeView, refreshElements)
          ElementActions.changeElementProperty(screen, 'is_new', false)
        } else {
          ElementActions.updateScreen(screen, closeView, refreshElements)
        }
      })
    }
  }

  handleCopy(event, element) {
    const { currentCollection } = UIStore.getState();

    if (element.type == 'sample') {
      ElementActions.copySampleInline(element);
    } else if (element.type == 'reaction') {
      ElementActions.copyReactionInline(element);
    } else if (element.type == 'wellplate') {

    } else if (element.type == 'screen') {

    }
  }

  renderButtons() {
    const { elements, type } = this.props;

    return (
      <FormGroup>
        <Button bsSize="xsmall" bsStyle="warning" onClick={(event) => this.handleSave(event, elements, type)}>
          <i className="fa fa-floppy-o" />
        </Button>
      </FormGroup>
    )
  }

  render() {
    const { elements, type } = this.props;

    return (
      <Table className="elements-inline" condensed>
        <thead>
          <tr>
            {type == 'sample' && <SampleInlineHead />}
            {type == 'reaction' && <ReactionInlineHead />}
            {type == 'wellplate' && <WellplateInlineHead />}
            {type == 'screen' && <ScreenInlineHead />}
            <th style={{ width: 63 }}>
              {this.renderButtons()}
            </th>
          </tr>
        </thead>
        <tbody>
          {
            elements.map((element, index) => {
              if (type == 'sample') {
                return <SampleInlineProperties key={index} sample={element} onCopy={this.handleCopy} onSave={this.handleSave} showDetails={this.showDetails} />
              } else if (type == 'reaction') {
                return <ReactionInlineProperties key={index} reaction={element} onCopy={this.handleCopy} onSave={this.handleSave} showDetails={this.showDetails} />
              } else if (type == 'wellplate') {
                return <WellplateInlineProperties key={index} wellplate={element} onCopy={this.handleCopy} onSave={this.handleSave} showDetails={this.showDetails} />
              } else if (type == 'screen') {
                return <ScreenInlineProperties key={index} screen={element} onCopy={this.handleCopy} onSave={this.handleSave} showDetails={this.showDetails} />
              }
            })
          }
        </tbody>
      </Table>
    )
  }
}
