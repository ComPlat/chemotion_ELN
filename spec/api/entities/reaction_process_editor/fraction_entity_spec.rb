# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::FractionEntity do
  subject(:represented_fraction) { described_class.represent(fraction).as_json }

  context 'with consuming action' do
    let(:action) { create(:reaction_process_activity, activity_name: 'ADD') }
    let(:fraction) { create(:fraction, consuming_action: action) }

    it 'exposes the consuming action name' do
      expect(represented_fraction).to include(consuming_action_name: 'ADD')
    end
  end

  context 'without consuming action' do
    let(:fraction) { create(:fraction) }

    it 'falls back to DEFINE_FRACTION' do
      expect(represented_fraction).to include(consuming_action_name: 'DEFINE_FRACTION')
    end
  end
end
