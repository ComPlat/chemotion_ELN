import React from 'react'
import expect from 'expect'
import {originalState} from '../fixture/report'
import alt from '../../../app/assets/javascripts/components/alt'
import ReportActions from '../../../app/assets/javascripts/components/actions/ReportActions'
import ReportStore from '../../../app/assets/javascripts/components/stores/ReportStore'

describe('ReportStore', () => {
  beforeEach(() => {
     alt.flush()
  })

  it('should initialize', () => {
    //const ReportStore = alt.stores.ReportStore
    const actual = ReportStore.getState()
    const expected = originalState
    expect(actual).toEqual(expected)
  })

  it('should handleUpdateSettings', () => {
    const oldState = ReportStore.getState()
    const payload = {text: "formula", checked: true}
    ReportActions.updateSettings(payload)
    const newState = ReportStore.getState()
    expect(newState.settings[0].checked).toEqual(!oldState.settings[0].checked)
  })

  it('should handleToggleSettingsCheckAll', () => {
    ReportActions.toggleSettingsCheckAll()
    const newState = ReportStore.getState()
    const expected = {
      settings: [ {text: "formula", checked: false},
                  {text: "material", checked: false},
                  {text: "description", checked: false},
                  {text: "purification", checked: false},
                  {text: "tlc", checked: false},
                  {text: "observation", checked: false},
                  {text: "analysis", checked: false},
                  {text: "literature", checked: false} ],
      configs: [ {text: "Page Break", checked: true},
                 {text: "Show all material in formulas (unchecked to show Products only)", checked: true} ],
      checkedAllSettings: false,
      checkedAllConfigs: true,
      processingReport: false,
      selectedReactionIds: [],
      selectedReactions: [],
    }
    expect(newState).toEqual(expected)
  })

  it('should handleUpdateConfigs', () => {
    const oldState = ReportStore.getState()
    const payload= {text: "Page Break", checked: true}
    ReportActions.updateConfigs(payload)
    const newState = ReportStore.getState()
    expect(newState.configs[0].checked).toEqual(!oldState.configs[0].checked)
  })

  it('should handleToggleConfigsCheckAll', () => {
    const oldState = ReportStore.getState()
    ReportActions.toggleConfigsCheckAll()
    const newState = ReportStore.getState()
    expect(newState.checkedAllConfigs).toEqual(!oldState.checkedAllConfigs)
    expect(newState.configs[0].checked).toEqual(!oldState.configs[0].checked)
  })
})
