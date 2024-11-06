import expect from 'expect'
import { originalState } from '../fixture/report'
import alt from '../../../app/javascript/src/stores/alt/alt'
import ReportActions from '../../../app/javascript/src/stores/alt/actions/ReportActions'
import ReportStore from '../../../app/javascript/src/stores/alt/stores/ReportStore'

describe('ReportStore', () => {
  beforeEach(() => {
    alt.flush()
  })

  it('should initialize', () => {
    const actual = ReportStore.getState()
    const expected = originalState
    expected.fileName = actual.fileName
    expect(actual).toEqual(expected)
  })

  it('should handleUpdateSplSettings', () => {
    const oldState = ReportStore.getState()
    const payload = { text: "diagram", checked: true }
    ReportActions.updateSplSettings(payload)
    const newState = ReportStore.getState()
    expect(newState.splSettings[0].checked).toEqual(!oldState.splSettings[0].checked)
  })

  it('should handleUpdateRxnSettings', () => {
    const oldState = ReportStore.getState()
    const payload = { text: "diagram", checked: true }
    ReportActions.updateRxnSettings(payload)
    const newState = ReportStore.getState()
    expect(newState.rxnSettings[0].checked).toEqual(!oldState.rxnSettings[0].checked)
  })

  it('should handleToggleSplSettingsCheckAll', () => {
    ReportActions.toggleSplSettingsCheckAll()
    const newState = ReportStore.getState()
    const expected = {
      ...originalState,
      checkedAllSplSettings: false,
      splSettings: [{ text: "diagram", checked: false },
      { text: "collection", checked: false },
      { text: "analyses", checked: false },
      { text: "reaction description", checked: false },
      { text: "literature", checked: false }]
    }
    expect(newState).toEqual(expected)
  })

  it('should handleToggleRxnSettingsCheckAll', () => {
    ReportActions.toggleRxnSettingsCheckAll()
    const newState = ReportStore.getState()
    const expected = {
      ...originalState,
      checkedAllRxnSettings: false,
      rxnSettings: [{ text: "diagram", checked: false },
      { text: "material", checked: false },
      { text: "description", checked: false },
      { text: "purification", checked: false },
      { text: "dangerous products", checked: false },
      { text: "tlc", checked: false },
      { text: "observation", checked: false },
      { text: "analysis", checked: false },
      { text: "literature", checked: false },
      { text: "variations", checked: false }]
    }
    expect(newState).toEqual(expected)
  })

  it('should handleUpdateConfigs', () => {
    const oldState = ReportStore.getState()
    const payload = { text: "Page Break", checked: true }
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
