# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::UpdateVariations do
  let(:variations) do
    [
      {
        'startingMaterials' => { '42' => {} },
        'reactants' => { '43' => {} },
        'products' => { '44' => {}, '45' => {} },
        'solvents' => {},
      },
      {
        'startingMaterials' => { '42' => {} },
        'reactants' => { '43' => {} },
        'products' => { '44' => {}, '45' => {} },
        'solvents' => {},
      },
    ]
  end
  let(:user) { create(:user) }
  let(:collection) { Collection.create!(user: user, label: 'collection') }
  let(:reaction) { Reaction.create!(variations: variations, collections: [collection], creator: user) }
  let(:sample_a) { create(:sample) }
  let(:sample_b) { create(:sample) }
  let(:sample_c) { create(:sample) }
  let(:sample_d) { create(:sample) }
  let(:material_ids) do
    {
      startingMaterials: [sample_a.id],
      reactants: [sample_b.id],
      products: [sample_c.id, sample_d.id],
      solvents: [],
    }
  end
  let(:material_groups) { %w[startingMaterials reactants products solvents] }

  before do
    ReactionsStartingMaterialSample.create!(reaction_id: reaction.id, sample_id: sample_a.id)
    ReactionsReactantSample.create!(reaction_id: reaction.id, sample_id: sample_b.id)
    ReactionsProductSample.create!(reaction_id: reaction.id, sample_id: sample_c.id)
    ReactionsProductSample.create!(reaction_id: reaction.id, sample_id: sample_d.id)
    reaction.reload
  end

  it "updates variations' material IDs" do
    updated_variations = described_class.new(reaction).execute!
    updated_variations.each do |variation|
      material_groups.each do |material_group|
        expect(variation[material_group].keys).to eq(material_ids[material_group.to_sym])
      end
    end
  end

  it 'raises when number of materials is inconsistent' do
    reaction.variations.first['startingMaterials'].delete('42')
    expect do
      described_class.new(reaction).execute!
    end.to raise_error(RuntimeError,
                       'The variations do not contain the same number of startingMaterials as the reaction.')
  end
end
