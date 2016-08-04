import React from 'react'
import expect from 'expect'
import ReportActions from '../../../app/assets/javascripts/components/actions/ReportActions'
Object.assign = require('object-assign')

describe('ReportActions', () => {

  describe('updateSettings', () => {
    it('should return the Setting', () => {
      const payload = {text: "formula", checked: true}
      const actual = ReportActions.updateSettings(payload)
      const expected = payload
      expect(actual).toEqual(expected)
    })
  })

  describe('toggleSettingsCheckAll', () => {
    it('should return null', () => {
      const actual = ReportActions.toggleSettingsCheckAll()
      const expected = null
      expect(actual).toEqual(expected)
    })
  })

  describe('updateConfigs', () => {
    it('should return the Config', () => {
      const payload = {text: "Page Break", checked: true}
      const actual = ReportActions.updateConfigs(payload)
      const expected = payload
      expect(actual).toEqual(expected)
    })
  })

  describe('toggleConfigsCheckAll', () => {
    it('should return null', () => {
      const actual = ReportActions.toggleConfigsCheckAll()
      const expected = null
      expect(actual).toEqual(expected)
    })
  })
})
