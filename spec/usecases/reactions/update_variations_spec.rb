# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::UpdateVariations do
  let(:user) { create(:user) }
  let(:collection) { Collection.create!(user: user, label: 'collection') }

  let(:molecule_w) { create(:molecule) }
  let(:molecule_x) { create(:molecule) }
  let(:molecule_y) { create(:molecule) }
  let(:molecule_z) { create(:molecule) }

  let(:sample_a) { create(:sample, id: 42, molecule: molecule_w) }
  let(:sample_b) { create(:sample, id: 43, molecule: molecule_x) }
  let(:sample_c) { create(:sample, id: 44, molecule: molecule_y) }
  let(:sample_d) { create(:sample, id: 45, molecule: molecule_z) }

  let(:sample_e) { create(:sample, id: 46, molecule: molecule_w) }
  let(:sample_f) { create(:sample, id: 47, molecule: molecule_x) }
  let(:sample_g) { create(:sample, id: 48, molecule: molecule_y) }
  let(:sample_h) { create(:sample, id: 49, molecule: molecule_z) }

  let(:uuid_a) { SecureRandom.uuid }
  let(:uuid_b) { SecureRandom.uuid }
  let(:variations) do
    [
      [uuid_a, {
        'uuid' => uuid_a,
        'startingMaterials' => { sample_a.id => {} },
        'reactants' => { sample_b.id => {} },
        'products' => { sample_c.id => {}, sample_d.id => {} },
        'solvents' => {},
      }],
      [uuid_b, {
        'uuid' => uuid_b,
        'startingMaterials' => { sample_a.id => {} },
        'reactants' => { sample_b.id => {} },
        'products' => { sample_c.id => {}, sample_d.id => {} },
        'solvents' => {},
      }],
    ].to_h
  end

  let(:reaction_a) do
    create(
      :reaction, variations: variations,
                 starting_materials: [sample_e], solvents: [],
                 reactants: [sample_f], products: [sample_g, sample_h],
                 collections: [collection], creator: user
    )
  end
  let(:reaction_b) do
    create(
      :reaction, variations: variations,
                 starting_materials: [sample_e], solvents: [],
                 reactants: [sample_f], products: [sample_g],
                 collections: [collection], creator: user
    )
  end
  let(:material_ids) do
    {
      startingMaterials: [sample_e.id],
      reactants: [sample_f.id],
      products: [sample_g.id, sample_h.id],
      solvents: [],
    }
  end
  let(:material_groups) { %w[startingMaterials reactants products solvents] }

  it "updates variations' material IDs" do
    updated_variations = described_class.new(reaction_a).execute!
    updated_variations.each do |variation|
      material_groups.each do |material_group|
        expect(variation[material_group].keys).to eq(material_ids[material_group.to_sym])
      end
    end
  end

  it 'raises when no matching sample is found' do
    expect do
      described_class.new(reaction_b).execute!
    end.to raise_error described_class::UpdateVariationsError
  end
end
