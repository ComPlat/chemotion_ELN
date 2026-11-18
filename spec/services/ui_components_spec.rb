# frozen_string_literal: true

require 'rails_helper'

describe UiComponents do
  describe '.enabled?' do
    def stub_config(value)
      config = value.nil? ? value : ActiveSupport::OrderedOptions.new.merge(value)
      allow(Rails.configuration).to receive(:ui_components).and_return(config)
    end

    it 'is enabled when explicitly set to true' do
      stub_config(weighing_tasks: true)
      expect(described_class.enabled?(:weighing_tasks)).to be(true)
    end

    it 'is disabled when explicitly set to false' do
      stub_config(weighing_tasks: false)
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'is disabled (fail closed) when the component key is absent' do
      stub_config(other_component: true)
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'is disabled (fail closed) when no configuration is present' do
      stub_config(nil)
      expect(described_class.enabled?(:weighing_tasks)).to be(false)
    end

    it 'accepts a string component name' do
      stub_config(weighing_tasks: true)
      expect(described_class.enabled?('weighing_tasks')).to be(true)
    end
  end
end
