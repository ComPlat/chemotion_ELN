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
               collections: [c1], solvent: [{:label=>'Acetone', :smiles=>'CC(C)=O', :ratio=>'100'}].to_json
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

  describe 'import/export research plan' do
    let(:research_plan) { build(:research_plan, creator: u1, collections: [c1]) }
    let(:research_plan_metadata) { create(:research_plan_metadata, research_plan: research_plan) }
    let(:ignored_attributes) { %w[id research_plan_id created_at updated_at parent_id] }

    let(:first_metadata) { c1.research_plans.first.research_plan_metadata.attributes.except(*ignored_attributes) }
    let(:second_metadata) { c2.research_plans.first.research_plan_metadata.attributes.except(*ignored_attributes) }

    let(:first_analyses) { c1.research_plans.first.analyses.map { |a| a.attributes.except(*ignored_attributes) } }
    let(:second_analyses) { c2.research_plans.first.analyses.map { |a| a.attributes.except(*ignored_attributes) } }

    before do
      research_plan.research_plan_metadata = research_plan_metadata
      research_plan.save!

      analyses = Container.find_by(parent_id: research_plan.container.id)

      Container.create!(parent: analyses,
                        container_type: 'analysis',
                        name: 'new',
                        description: 'analysis description',
                        extended_metadata: {
                          'kind' => 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)',
                          'status' => 'Confirmed',
                          'datasets' => [],
                          'content' => '{"ops": [{"insert": "analysis contents"}]}'
                        })

      export = Export::ExportJson.new(collection_id: c1.id, research_plan_ids: [research_plan.id]).export.to_json
      import = Import::ImportJson.new(collection_id: c2.id, data: export, user_id: u2.id).import

    end

    it 'copies the research plan' do
      expect(c2.research_plans.count).to be(1)
      expect(c2.research_plans.map(&:collections).flatten.size).to be(2)
      expect(c2.research_plans.first.body).to eq(c1.research_plans.first.body)
    end

    it 'copies metadata' do
      expect(first_metadata).to eq(second_metadata)
    end

    it 'copies analyses' do
      expect(first_analyses).to eq(second_analyses)
    end
  end

  context 'without uuid lock, ' do
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

    context 'Sample with new solvent' do
      before do
        json = Export::ExportJson.new(
          collection_id: c1.id, sample_ids: [s2.id]
        ).export.to_json
        imp = Import::ImportJson.new(
          collection_id: c2.id, data: json, user_id: u2.id
        ).import
      end

      it 'imports the exported sample' do
        expect(c2.samples).not_to be_empty
        expected_sample = c2.samples.find_by(name: s2.name)
        expect(expected_sample).not_to be_nil
        # solvents = [{ 'label' => 'Acetone', 'smiles' => 'CC(C)=O', 'ratio' => '100' }]
        expect(expected_sample['solvent'][0]).to include(
          'label' => 'Acetone',
          'smiles' => 'CC(C)=O',
          'ratio' => '100'
        )
      end
    end

    context 'Sample with old solvent' do
      before do
        export_json = Export::ExportJson.new(
          collection_id: c1.id, sample_ids: [s2.id]
        ).export.to_json

        data = JSON.parse(export_json)
        data['samples'].values[0]['solvent'] = 'Acetone'
        json = data.to_json
        imp = Import::ImportJson.new(
          collection_id: c2.id, data: json, user_id: u2.id
        ).import
      end

      it 'imports the exported sample' do
        expect(c2.samples).not_to be_empty
        expected_sample = c2.samples.find_by(name: s2.name)
        expect(expected_sample).not_to be_nil
        solvents = [{ label: 'Acetone', smiles: 'CC(C)=O', ratio: '100' }]
        solvent = JSON.parse(expected_sample['solvent'].to_json)

        expect(expected_sample['solvent'][0]).to include(
          'label' => 'Acetone',
          'smiles' => 'CC(C)=O',
          'ratio' => '100'
        )
      end
    end
  end
end
