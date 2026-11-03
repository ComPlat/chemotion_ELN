# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::GasExchangeActionExporter do
  subject(:gas_exchange_export) { described_class.new(action).to_clap(starts_at: 0).gas_exchange }

  let(:action) do
    create(
      :reaction_process_activity,
      activity_name: 'GAS_EXCHANGE',
      workup: { gas_type: [{ id: 'GAS:1', label: 'Nitrogen', ratio: 1 }] }.deep_stringify_keys,
    )
  end

  before do
    ReactionProcessEditor::Ontology.create!(ontology_id: 'GAS:1', label: 'Nitrogen', name: 'Nitrogen')
  end

  it 'exports gas type ratios' do
    expect(gas_exchange_export.to_h).to eq(
      gas_type: [
        {
          solvent: { label: 'Nitrogen', ontology: { id: 'GAS:1', label: 'Nitrogen', name: 'Nitrogen' } },
          ratio: '1',
        },
      ],
    )
  end
end
