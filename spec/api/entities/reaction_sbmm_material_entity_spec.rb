# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Entities::ReactionSbmmMaterialEntity do
  let(:user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:stock) do
    SequenceBasedMacromoleculeSample.create!(name: 'SBMM stock', short_label: 'SBMM-ENT-1',
                                             sequence_based_macromolecule: create(:uniprot_sbmm), user: user)
  end
  let(:split) { stock.create_sub_sequence_based_macromolecule_sample(user, [collection.id]) }
  let(:reaction) { create(:reaction, collections: [collection]) }
  let(:link) do
    ReactionsReactantSbmmSample.create!(reaction: reaction, sequence_based_macromolecule_sample: split, position: 0)
  end

  it 'exposes the stock the reaction material was split from' do
    expect(described_class.represent(link).as_json[:parent_id]).to eq(stock.id)
  end
end
