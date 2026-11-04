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
      startingMaterials: [sample_e.id.to_s],
      reactants: [sample_f.id.to_s],
      products: [sample_g.id.to_s, sample_h.id.to_s],
      solvents: [],
    }
  end
  let(:material_groups) { %w[startingMaterials reactants products solvents] }

  def variation(materials)
    uuid = SecureRandom.uuid
    { 'uuid' => uuid, 'startingMaterials' => {}, 'reactants' => {}, 'products' => {}, 'solvents' => {} }
      .merge(materials.transform_keys(&:to_s))
  end

  it "updates variations' material IDs" do
    updated_variations = described_class.new(reaction_a).execute!
    updated_variations.each do |variation|
      material_groups.each do |material_group|
        expect(variation[material_group].keys).to eq(material_ids[material_group.to_sym])
      end
    end
  end

  it 'keeps the material IDs of a reaction that references its own samples' do
    reaction = create(
      :reaction, starting_materials: [sample_e], reactants: [sample_f], products: [sample_g, sample_h],
                 collections: [collection], creator: user
    )
    own_variations = [variation(
      startingMaterials: { sample_e.id.to_s => { 'mass' => 1 } },
      reactants: { sample_f.id.to_s => { 'mass' => 2 } },
      products: { sample_g.id.to_s => { 'mass' => 3 }, sample_h.id.to_s => { 'mass' => 4 } },
    )]
    reaction.update!(variations: own_variations)

    expect(described_class.new(reaction.reload).execute!).to eq(reaction.variations)
  end

  it 'drops material IDs without a matching sample instead of raising' do
    updated_variations = described_class.new(reaction_b).execute!

    updated_variations.each do |variation|
      expect(variation['startingMaterials'].keys).to eq([sample_e.id.to_s])
      expect(variation['reactants'].keys).to eq([sample_f.id.to_s])
      expect(variation['products'].keys).to eq([sample_g.id.to_s])
    end
  end

  it 'drops the material ID of a soft-deleted sample' do
    removed_sample = create(:sample, molecule: molecule_x)
    reaction = create(
      :reaction, starting_materials: [sample_e], collections: [collection], creator: user
    )
    reaction.update!(variations: [variation(
      startingMaterials: { sample_e.id.to_s => { 'mass' => 1 }, removed_sample.id.to_s => { 'mass' => 2 } },
    )])
    removed_sample.destroy

    updated_variations = described_class.new(reaction.reload).execute!

    expect(updated_variations.first['startingMaterials']).to eq(sample_e.id.to_s => { 'mass' => 1 })
  end

  it 'drops unknown keys, e.g., of sequence-based macromolecule samples of another reaction' do
    reaction = create(:reaction, reactants: [sample_f], collections: [collection], creator: user)
    reaction.update!(variations: [variation(
      reactants: { sample_b.id.to_s => { 'mass' => 1 }, 'sbmm:999999' => { 'mass' => 2 } },
    )])

    updated_variations = described_class.new(reaction.reload).execute!

    expect(updated_variations.first['reactants']).to eq(sample_f.id.to_s => { 'mass' => 1 })
  end

  it 'maps two source materials with the same molecule to distinct samples' do
    source_sample_one = create(:sample, molecule: molecule_w)
    source_sample_two = create(:sample, molecule: molecule_w)
    copied_sample_one = create(:sample, molecule: molecule_w)
    copied_sample_two = create(:sample, molecule: molecule_w)
    reaction = create(
      :reaction, starting_materials: [copied_sample_one, copied_sample_two],
                 collections: [collection], creator: user
    )
    reaction.update!(variations: [variation(
      startingMaterials: {
        source_sample_one.id.to_s => { 'mass' => 1 },
        source_sample_two.id.to_s => { 'mass' => 2 },
      },
    )])

    updated_variations = described_class.new(reaction.reload).execute!

    expect(updated_variations.first['startingMaterials']).to eq(
      copied_sample_one.id.to_s => { 'mass' => 1 },
      copied_sample_two.id.to_s => { 'mass' => 2 },
    )
  end
end
