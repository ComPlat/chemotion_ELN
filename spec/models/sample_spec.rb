# frozen_string_literal: true

# == Schema Information
#
# Table name: samples
#
#  id                  :integer          not null, primary key
#  ancestry            :string           default("/"), not null
#  boiling_point       :numrange
#  created_by          :integer
#  decoupled           :boolean          default(FALSE), not null
#  deleted_at          :datetime
#  density             :float            default(0.0)
#  deprecated_solvent  :string           default("")
#  description         :text             default("")
#  dry_solvent         :boolean          default(FALSE)
#  external_label      :string           default("")
#  identifier          :string
#  imported_readout    :string
#  impurities          :string           default("")
#  inventory_sample    :boolean          default(FALSE)
#  is_top_secret       :boolean          default(FALSE)
#  location            :string           default("")
#  melting_point       :numrange
#  metrics             :string           default("mmm")
#  molarity_unit       :string           default("M")
#  molarity_value      :float            default(0.0)
#  molecular_mass      :float
#  molfile             :binary
#  molfile_version     :string(20)
#  name                :string
#  purity              :float            default(1.0)
#  real_amount_unit    :string
#  real_amount_value   :float
#  sample_details      :jsonb
#  sample_svg_file     :string
#  sample_type         :string           default("Micromolecule")
#  short_label         :string
#  solvent             :jsonb
#  stereo              :jsonb
#  sum_formula         :string
#  target_amount_unit  :string           default("g")
#  target_amount_value :float            default(0.0)
#  xref                :jsonb
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  fingerprint_id      :integer
#  molecule_id         :integer
#  molecule_name_id    :integer
#  user_id             :integer
#
# Indexes
#
#  index_samples_on_ancestry          (ancestry) WHERE (deleted_at IS NULL)
#  index_samples_on_deleted_at        (deleted_at)
#  index_samples_on_identifier        (identifier)
#  index_samples_on_inventory_sample  (inventory_sample)
#  index_samples_on_molecule_name_id  (molecule_name_id)
#  index_samples_on_sample_id         (molecule_id)
#  index_samples_on_user_id           (user_id)
#
require 'rails_helper'
require Rails.root.join 'spec/concerns/taggable.rb'

RSpec.describe Sample do
  describe 'creation' do
    let(:sample) { create(:sample) }

    it 'is possible to create a valid sample' do
      expect(sample.valid?).to be(true)
    end

    it 'has molecule_name_id' do
      expect(sample.molecule_name_id).not_to be_blank
    end
  end

  describe 'taggable' do
    # it_behaves_like 'taggable_element_before_and_after_create'
    # it_behaves_like 'taggable_element_before_and_after_collection_update'
    # it_behaves_like 'taggable_reaction_sample_before_and_after_update'
    it_behaves_like 'taggable_element_before_and_after_analyses_update'
  end

  describe 'after creation' do
    let(:sample)  { create(:sample) }
    let(:samples) { create_list(:sample, 500) }

    it 'has a CodeLog' do
      expect(sample.code_log.value).to match(/\d{40}/)
      expect(sample.code_log.id).to match(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
    end
  end

  describe 'hierarchical sample fields (state, color, storage_condition, height, width, length)' do
    it 'persists and returns state when set on the column' do
      sample = create(:sample, state: 'solid')
      expect(sample.state).to eq('solid')
      expect(sample.reload.state).to eq('solid')
    end

    it 'persists and returns color when set on the column' do
      sample = create(:sample, color: 'red')
      expect(sample.color).to eq('red')
      expect(sample.reload.color).to eq('red')
    end

    it 'persists and returns storage_condition when set on the column' do
      sample = create(:sample, storage_condition: 'room temperature')
      expect(sample.storage_condition).to eq('room temperature')
      expect(sample.reload.storage_condition).to eq('room temperature')
    end

    it 'persists and returns height, width, length when set on the column' do
      sample = create(:sample, height: 2.5, width: 1.0, length: 3.0)
      expect(sample.height).to eq(2.5)
      expect(sample.width).to eq(1.0)
      expect(sample.length).to eq(3.0)
      sample.reload
      expect(sample.height).to eq(2.5)
      expect(sample.width).to eq(1.0)
      expect(sample.length).to eq(3.0)
    end

    it 'falls back to sample_details when column is blank' do
      sample = create(:sample, state: nil, sample_details: { 'state' => 'liquid', 'color' => 'blue' })
      expect(sample.state).to eq('liquid')
      expect(sample.color).to eq('blue')
    end

    it 'falls back to xref when column and sample_details are blank' do
      sample = create(:sample, state: nil, sample_details: {}, xref: { 'state' => 'gas' })
      expect(sample.state).to eq('gas')
    end

    it 'prefers column over sample_details and xref' do
      sample = create(:sample, state: 'column', sample_details: { 'state' => 'details' }, xref: { 'state' => 'xref' })
      expect(sample.state).to eq('column')
    end
  end

  describe 'deletion' do
    let(:sample) { create(:sample) }
    let(:starting_material_reaction) { create(:reaction) }
    let(:product_reaction) { create(:reaction) }
    let(:wellplate)  { create(:wellplate) }
    let(:well)       { create(:well, sample: sample, wellplate: wellplate) }
    let(:collection) { create(:collection) }

    before do
      # CollectionsSample.create!(sample: sample, collection: collection)
      ReactionsStartingMaterialSample.create!(sample: sample, reaction: starting_material_reaction)
      ReactionsReactantSample.create!(sample: sample, reaction: starting_material_reaction)
      ReactionsProductSample.create!(sample: sample, reaction: product_reaction)
      sample.destroy
      wellplate.reload
    end

    # TODO: check that the associations are not destroyed
    it 'does not destroy associations for reaction' do
      expect(collection.collections_samples).to eq []
      expect(sample.reactions_starting_material_samples).to eq []
      # expect(reaction1.reactions_starting_material_samples).to eq sample.reactions_starting_material_samples
      # expect(reaction1.reactions_reactant_samples).to eq sample
      # expect(reaction2.reactions_product_samples).to eq sample
      # expect(wellplate.wells).to eq []
    end

    it 'only soft deletes sample' do
      expect(described_class.with_deleted).to eq [sample]
    end

    it 'also destroys corresponding CodeLog' do
      expect(CodeLog.where(source: 'sample', source_id: sample.id)).to be_empty
    end
  end

  describe 'for_ui_state scope' do
    let(:first_collection) { create(:collection) }
    let(:second_collection) { create(:collection) }
    let(:first_sample) { create(:sample) }
    let(:second_sample) { create(:sample) }
    let(:third_sample) { create(:sample) }

    let(:ui_state) do
      {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: first_collection.id,
      }
    end

    before do
      CollectionsSample.create!(collection: first_collection, sample: first_sample)
      CollectionsSample.create!(collection: first_collection, sample: second_sample)
      CollectionsSample.create!(collection: second_collection, sample: third_sample)
    end

    it 'returns samples according to ui_state' do
      expect(described_class.for_ui_state(ui_state)).to contain_exactly(first_sample, second_sample)
    end
  end

  context 'when updating molfile' do
    let(:molfile) do
      <<~MOLFILE
        H2O Water 7732185
        ##CCCBDB 8251509:58
        Geometry Optimized at HF/STO-3G
          3  2  0  0  0  0  0  0  0  0    V2000
            0.0000    0.0000    0.1271 O  0000000000000000000
            0.0000    0.7580   -0.5085 H  0000000000000000000
            0.0000   -0.7580   -0.5085 H  0000000000000000000
          1  2  1  0     0  0
          1  3  1  0     0  0
        M  END
      MOLFILE
    end
    let(:sample) { build(:sample, molfile: molfile) }
    let(:mol_attributes) do
      {
        'boiling_point' => nil,
        'density' => 0.0,
        'inchikey' => 'XLYOFNOQVPJJNP-UHFFFAOYSA-N',
        'inchistring' => 'InChI=1S/H2O/h1H2',
        'iupac_name' => 'oxidane',
        'melting_point' => nil,
        'molecular_weight' => 18.01528,
        #  "molecule_svg_file" => "XLYOFNOQVPJJNP-UHFFFAOYSA-N.svg", #todo
        'molfile' => molfile.rstrip,
        'names' => %w[water oxidane],
        'sum_formular' => 'H2O',
      }
    end

    before do
      sample.collections << build(:collection)
      sample.creator = build(:person)
    end

    it 'creates a molecule' do
      sample.save!
      molecule = sample.molecule
      expect(molecule).to be_present
    end

    it 'retrieves molecule information' do
      sample.save!
      molecule = sample.molecule
      mol_attributes.each do |k, v|
        expect(molecule.attributes[k]).to eq(v)
      end
    end

    # #Fixme : now file are anonymised
    # it 'should create the molecule svg file' do
    #  expect(File).to receive(:new)
    #  .with('public/images/molecules/XLYOFNOQVPJJNP-UHFFFAOYSA-N.svg','w+').and_call_original
    #  sample.save
    # end
  end

  describe 'molfiles with polymers' do
    # 3 R# with bonds, PolymersList + TextNode
    let(:molfile_three_r_with_bonds) do
      <<~MOL
        null
          Ketcher  3162612562D 1   1.00000     0.00000     0

          3  2  0  0  0  0  0  0  0  0999 V2000
           14.7204   -8.4388    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
           12.9704   -5.8637    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
           16.0954   -5.1512    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
          2  1  1  0     0  0
          3  1  1  0     0  0
        M  END
        > <PolymersList>
        0/52/1.50-2.00 1/10/1.00-1.00 2/13/1.28-1.20
        > <TextNode>
        2#qcy9t7#t_13_2#2wt.% pdC02
        1#lj5hkv#t_10_1#1wt.% pd
        0#iuauh5#t_52_0#y-A2023
        > </TextNode>
        > <TextNodeMeta>
        {blocks:{key:iuauh5,text:y-A2023,type:unstyled,depth:0,inlineStyleRanges:{style:fontsize-10,offset:0,length:7},entityRanges:,data:{fontSize:10}},entityMap:{}}
        {blocks:{key:lj5hkv,text:1wt.% pd,type:unstyled,depth:0,inlineStyleRanges:{style:fontsize-10,offset:0,length:8},entityRanges:,data:{fontSize:10}},entityMap:{}}
        {blocks:{key:qcy9t7,text:2wt.% pdC02,type:unstyled,depth:0,inlineStyleRanges:{style:fontsize-10,offset:0,length:11},entityRanges:,data:{fontSize:10}},entityMap:{}}
        > </TextNodeMeta>
        $$$$
      MOL
    end

    # 3 R# no bonds
    let(:molfile_three_r_no_bonds) do
      <<~MOL
        null
          Ketcher  3162611212D 1   1.00000     0.00000     0

          3  0  0  0  0  0  0  0  0  0999 V2000
           10.7676   -9.1906    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
           10.6089   -6.9032    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
           11.1060   -4.6344    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        M  END
        > <PolymersList>
        0/10/1.00-1.00 1/12/1.00-1.00 2/40/2.00-2.00
        > <TextNode>
        2#1p38o0#t_40_2#asasdfa
        1#hlts8j#t_12_1#sgsfgsf
        0#porj4w#t_10_0#asfasd
        > </TextNode>
        > <TextNodeMeta>
        {"blocks":[{"key":"porj4w","text":"asfasd","type":"unstyled","depth":0,"inlineStyleRanges":[{"style":"fontsize-10","offset":0,"length":6}],"entityRanges":[],"data":{"fontSize":10}}],"entityMap":{}}
        {"blocks":[{"key":"hlts8j","text":"sgsfgsf","type":"unstyled","depth":0,"inlineStyleRanges":[{"style":"fontsize-10","offset":0,"length":7}],"entityRanges":[],"data":{"fontSize":10}}],"entityMap":{}}
        {"blocks":[{"key":"1p38o0","text":"asasdfa","type":"unstyled","depth":0,"inlineStyleRanges":[{"style":"fontsize-10","offset":0,"length":7}],"entityRanges":[],"data":{"fontSize":10}}],"entityMap":{}}
        > </TextNodeMeta>
        $$$$
      MOL
    end

    # 1 R#
    let(:molfile_one_r) do
      <<~MOL
        null
          Ketcher  3112615482D 1   1.00000     0.00000     0

          1  0  0  0  0  0  0  0  0  0999 V2000
           18.8287   -6.8500    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        M  END
        > <PolymersList>
        0/10/1.00-1.00
        > <TextNode>
        0#oee0kg#t_10_0#1wt.% pdpt
        > </TextNode>
        > <TextNodeMeta>
        {"blocks":[{"key":"oee0kg","text":"1wt.% pdpt","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[],"data":{}}],"entityMap":{}}
        > </TextNodeMeta>
        $$$$
      MOL
    end

    it 'recognizes molfile with 3 R# and bonds (PolymersList + TextNode)' do
      expect(Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(molfile_three_r_with_bonds)).to be true
      expect(Chemotion::MolfilePolymerSupport.has_text_node_tag?(molfile_three_r_with_bonds)).to be true
      payload = Chemotion::SvgRenderer.parse_polymer_payload(molfile_three_r_with_bonds)
      expect(payload[:polymers].size).to eq(3)
      expect(payload[:polymers][0]).to eq(atom_index: 0, template_id: 52, height: 1.5, width: 2.0)
      expect(payload[:text_by_index]).to eq(0 => 'y-A2023', 1 => '1wt.% pd', 2 => '2wt.% pdC02')
    end

    it 'recognizes molfile with 3 R# and no bonds' do
      expect(Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(molfile_three_r_no_bonds)).to be true
      payload = Chemotion::SvgRenderer.parse_polymer_payload(molfile_three_r_no_bonds)
      expect(payload[:polymers].size).to eq(3)
      expect(payload[:text_by_index]).to eq(0 => 'asfasd', 1 => 'sgsfgsf', 2 => 'asasdfa')
    end

    it 'recognizes molfile with single R#' do
      expect(Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(molfile_one_r)).to be true
      payload = Chemotion::SvgRenderer.parse_polymer_payload(molfile_one_r)
      expect(payload[:polymers].size).to eq(1)
      expect(payload[:polymers][0]).to eq(atom_index: 0, template_id: 10, height: 1.0, width: 1.0)
      expect(payload[:text_by_index]).to eq(0 => '1wt.% pdpt')
    end
  end

  context 'when counting samples created by user' do
    let(:user) { create(:person) }

    before do
      create_list(:sample, 3, creator: user)
    end

    it 'associates the samples with its creator' do
      expect(described_class.last.creator).to eq(user)
      expect(user.samples_created.count).to eq(3)
    end

    it 'counts samples created by user' do
      user.reload
      expect(user.counters['samples'].to_i).to eq(3)
    end
  end

  context 'when counting subsamples created per sample' do
    let(:sample) { create(:sample) }

    before do
      create_list(:sample, 3, parent: sample)
    end

    it 'associates the subsamples with its parent' do
      expect(sample.children.count).to eq(3)
    end
  end

  describe 'unit conversion' do
    let(:sample) { create(:sample) }

    context 'when given l & molarity' do
      before do
        sample.target_amount_value = 0.001991
        sample.target_amount_unit = 'l'
        sample.molarity_value = 1.23
        sample.density = 0
        sample.save!
      end

      it 'returns correct values' do
        expect(sample.amount_g.round(3)).to eq(0.044)
        expect(sample.amount_ml.round(3)).to eq(1.991)
        expect(sample.amount_mmol.round(3)).to eq(2.449)
      end
    end

    context 'when given l' do
      before do
        sample.target_amount_value = 0.002231
        sample.target_amount_unit = 'l'
        sample.molarity_value = 0
        sample.density = 0
        sample.save!
      end

      it 'returns correct values' do
        expect(sample.amount_g.round(3)).to eq(0.0)
        expect(sample.amount_ml.round(3)).to eq(2.231)
        expect(sample.amount_mmol.round(3)).to eq(0.0)
      end
    end

    context 'when given mol' do
      before do
        sample.target_amount_value = 0.00119
        sample.target_amount_unit = 'mol'
        sample.molarity_value = 0
        sample.density = 0
        sample.save!
      end

      it 'returns correct values' do
        expect(sample.amount_g.round(3)).to eq(0.021)
        expect(sample.amount_ml.round(3)).to eq(0.0)
        expect(sample.amount_mmol.round(3)).to eq(1.19)
      end
    end
  end

  describe 'create private note' do
    let(:reaction) { create(:reaction) }
    let(:note1) do
      create(:private_note, content: 'Note 1', noteable_id: reaction.id, noteable_type: 'Reaction')
    end

    before do
      reaction.update(private_notes: [note1])
    end

    it 'is possible to create a valid private note' do
      expect(reaction.private_notes).not_to be_nil
    end

    context 'when content is valid' do
      let(:n) { reaction.private_notes[0] }

      it 'is content valid' do
        expect(n.content).to eq note1.content
      end
    end
  end

  describe 'auto_set_short_label' do
    let(:sample) { create(:sample) }

    context 'when short label is "NEW SAMPLE"' do
      before do
        sample.short_label = 'NEW SAMPLE'
        sample.save!
        sample.send :auto_set_short_label
      end

      it 'short label is the user label' do
        expected_short_label = "#{sample.creator.name_abbreviation}-#{sample.creator.counters['samples']}"
        expect(sample.short_label).to eq expected_short_label
      end
    end
  end

  describe '#convert_amount_to_mol' do
    let(:molecule) { create(:molecule, molecular_weight: 100.0) }
    let(:sample) { create(:sample, molecule: molecule, purity: 1.0, density: 1.2, molarity_value: 0.5) }

    context 'with grams unit' do
      it 'converts grams to moles using molecular weight and purity' do
        result = sample.convert_amount_to_mol(200, 'g')
        expect(result).to eq(2.0) # (200g * 1.0) / 100g/mol = 2.0 mol
      end

      it 'returns nil when molecular weight is missing' do
        sample.molecule.update(molecular_weight: nil)
        result = sample.convert_amount_to_mol(200, 'g')
        expect(result).to be_nil
      end

      it 'applies purity in conversion' do
        sample.update(purity: 0.8)
        result = sample.convert_amount_to_mol(100, 'g')
        expect(result).to eq(0.8) # (100g * 0.8) / 100g/mol = 0.8 mol
      end
    end

    context 'with mol unit' do
      it 'returns the amount as-is for mol unit' do
        result = sample.convert_amount_to_mol(2.5, 'mol')
        expect(result).to eq(2.5)
      end
    end

    context 'with liters unit and molarity with density' do
      it 'converts liters to moles using density' do
        result = sample.convert_amount_to_mol(2.0, 'l')
        expect(result).to eq(24)
      end

      it 'convert using density when molarity is zero' do
        sample.update(molarity_value: 0.0)
        result = sample.convert_amount_to_mol(2.0, 'l')
        expect(result).to eq(24)
      end
    end

    context 'with liters unit but no molarity' do
      before { sample.update(molarity_value: 0.0) }

      it 'converts liters to moles using density and molecular weight' do
        result = sample.convert_amount_to_mol(1.0, 'l')
        # 1.0L * 1.2g/ml * 1000 * 1.0 / 100g/mol = 12.0 mol
        expect(result).to eq(12.0)
      end

      it 'returns nil when density is missing' do
        sample.update(density: 0.0)
        result = sample.convert_amount_to_mol(1.0, 'l')
        expect(result).to be_nil
      end
    end

    context 'with invalid inputs' do
      it 'returns nil for nil amount' do
        result = sample.convert_amount_to_mol(nil, 'g')
        expect(result).to be_nil
      end

      it 'returns nil for non-finite amount' do
        result = sample.convert_amount_to_mol(Float::INFINITY, 'g')
        expect(result).to be_nil
      end

      it 'returns nil for unknown unit' do
        result = sample.convert_amount_to_mol(100, 'unknown')
        expect(result).to be_nil
      end
    end
  end

  describe '#coerce_amount' do
    let(:sample) { create(:sample) }

    it 'converts valid numeric strings to float' do
      result = sample.send(:coerce_amount, '123.45')
      expect(result).to eq(123.45)
    end

    it 'converts integers to float' do
      result = sample.send(:coerce_amount, 100)
      expect(result).to eq(100.0)
    end

    it 'returns nil for nil input' do
      result = sample.send(:coerce_amount, nil)
      expect(result).to be_nil
    end

    it 'returns nil for non-finite numbers' do
      result = sample.send(:coerce_amount, Float::INFINITY)
      expect(result).to be_nil
    end
  end

  describe 'unit conversion helper methods' do
    let(:molecule) { create(:molecule, molecular_weight: 180.0) }
    let(:sample) { create(:sample, molecule: molecule, purity: 0.9, density: 1.1, molarity_value: 2.0) }

    describe '#convert_liters_to_moles' do
      it 'uses molarity when available' do
        sample.update(density: 0.0)
        result = sample.send(:convert_liters_to_moles, 0.5)
        expect(result).to eq(1.0) # 0.5L * 2.0mol/L = 1.0 mol
      end

      it 'uses density and molecular weight when no molarity' do
        sample.update(molarity_value: 0.0)
        result = sample.send(:convert_liters_to_moles, 1.0)
        # 1.0L * 1.1g/ml * 1000 * 0.9 / 180g/mol = 5.5 mol
        expect(result).to eq(5.5)
      end
    end

    describe '#convert_grams_to_moles' do
      it 'converts grams using molecular weight and purity' do
        result = sample.send(:convert_grams_to_moles, 200)
        expect(result).to eq(1.0) # (200g * 0.9) / 180g/mol = 1.0 mol
      end
    end

    describe '#valid_molecular_weight?' do
      it 'returns true for valid molecular weight' do
        result = sample.send(:valid_molecular_weight?)
        expect(result).to be true
      end

      it 'returns false when molecule is nil' do
        molecule.update(molecular_weight: nil)
        result = sample.send(:valid_molecular_weight?)
        expect(result).to be false
      end

      it 'returns false when molecular weight is zero' do
        sample.molecule.update(molecular_weight: 0.0)
        result = sample.send(:valid_molecular_weight?)
        expect(result).to be false
      end
    end
  end
end
