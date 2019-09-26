# frozen_string_literal: true

require 'rails_helper'

# test for ExportJson ImportJson
RSpec.describe 'ImportSdf' do
  let(:u1) do
    create(:person, first_name: 'P', last_name: '1', name_abbreviation: 'P1T')
  end
  let(:u2) do
    create(:person, first_name: 'P', last_name: '2', name_abbreviation: 'P2T')
  end
  let(:c1) { create(:collection, user_id: u1.id) }
  let(:c2) { create(:collection, user_id: u2.id) }

  let(:mf) do
    # file_fixture("test_2.mol").read
    IO.read(Rails.root.join('spec', 'fixtures', 'test_2.mol'))
  end
  let(:svg) do
    # file_fixture("test_2.mol").read
    IO.read(Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg'))
  end
  let(:s0) do
    build(
      :sample, created_by: u1.id, name: 'Sample zero', molfile: mf,
               collections: [c1]
    )
  end
  let(:s1) do
    build(
      :sample, created_by: u1.id, name: 'Starting mat', molfile: mf,
               collections: [c1]
    )
  end
  let(:s2) do
    build(
      :sample, created_by: u1.id, name: 'Solvent', molfile: mf,
               collections: [c1]
    )
  end
  let(:s3) do
    build(
      :sample, created_by: u1.id, name: 'Reactant', molfile: mf,
               collections: [c1]
    )
  end
  let(:s4) do
    build(
      :sample, created_by: u1.id, name: 'Product', molfile: mf,
               collections: [c1]
    )
  end
  let(:rxn) do
    build(
      :reaction, created_by: u1.id, name: 'Reaction 0',
                 starting_materials: [s1],
                 solvents: [s2],
                 reactants: [s3],
                 products: [s4],
                 collections: [c1]
    )
  end
  let(:mol_name) { 'Awesome Molecule' }
  let(:mn) do
    build(
      :molecule_name, user_id: u1.id, name: mol_name, molecule_id: s0.molecule_id
    )
  end

  before do
    u1.save!
    u2.save!
    c1.save!
    c2.save!
    s0.save!
    s1.save!
    s2.save!
    s3.save!
    s4.save!
    mn.save!
    s0.update!(molecule_name_id: mn.id)
    rxn.save!
  end

  context 'without uuid lock, ' do
    context 'only 1 sample, no analyses, ' do
      before do
        json = Export::ExportJson.new(
          collection_id: c1.id, sample_ids: [s0.id]
        ).export.to_json
        imp = Import::ImportJson.new(
          collection_id: c2.id, data: json, user_id: u2.id
        ).import
      end

      it 'imports the exported sample' do
        expect(c2.samples).not_to be_empty
        expect(c2.samples.find_by(name: s0.name)).not_to be_nil
      end
      it 'imports the custom sample molecule name' do
        expect(c2.samples.find_by(name: s0.name).molecule_name.name).to eq mol_name
      end
    end

    context '1 reaction (4 samples), ' do
      before do
        json = Export::ExportJson.new(
          collection_id: c1.id, reaction_ids: [rxn.id]
        ).export.to_json
        imp = Import::ImportJson.new(
          collection_id: c2.id, data: json, user_id: u2.id
        ).import
        @rxn = c2.reactions.find_by(name: rxn.name)
      end

      it 'imports the exported sample' do
        expect(c2.reactions).not_to be_empty
        expect(c2.samples).not_to be_empty
        expect(@rxn).not_to be_nil
        expect(@rxn.starting_materials.find_by(name: s1.name)).not_to be_nil
        expect(@rxn.solvents.find_by(name: s2.name)).not_to be_nil
        expect(@rxn.reactants.find_by(name: s3.name)).not_to be_nil
        expect(@rxn.products.find_by(name: s4.name)).not_to be_nil
      end
    end
  end
end
