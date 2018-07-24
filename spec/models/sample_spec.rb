require 'rails_helper'
require Rails.root.join 'spec/concerns/taggable.rb'

RSpec.describe Sample, type: :model do
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
      /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      )
    end
  end

  describe 'deletion' do
    let(:sample)     { create(:sample) }
    let(:reaction_1) { create(:reaction) }
    let(:reaction_2) { create(:reaction) }
    let(:wellplate)  { create(:wellplate) }
    let(:well)       { create(:well, sample: sample, wellplate: wellplate) }
    let(:collection) { create(:collection) }

    before do
      #CollectionsSample.create!(sample: sample, collection: collection)
      ReactionsStartingMaterialSample.create!(sample: sample, reaction: reaction_1)
      ReactionsReactantSample.create!(sample: sample, reaction: reaction_1)
      ReactionsProductSample.create!(sample: sample, reaction: reaction_2)
      sample.destroy
      wellplate.reload
    end

    #todo check that the associations are not destroyed
    it 'does not destroy associations for reaction' do
      expect(collection.collections_samples).to eq []
      expect(sample.reactions_starting_material_samples).to eq []
      #expect(reaction_1.reactions_starting_material_samples).to eq sample.reactions_starting_material_samples
      #expect(reaction_1.reactions_reactant_samples).to eq sample
      #expect(reaction_2.reactions_product_samples).to eq sample
      #expect(wellplate.wells).to eq []
    end

    it 'only soft deletes sample' do
      expect(Sample.with_deleted).to eq [sample]
    end

    it 'also destroys corresponding CodeLog' do
      expect(CodeLog.where(source: 'sample', source_id: sample.id)).to be_empty
    end
  end

  describe 'for_ui_state scope' do
    let(:c1) { create(:collection) }
    let(:c2) { create(:collection) }
    let(:s1) { create(:sample) }
    let(:s2) { create(:sample) }
    let(:s3) { create(:sample) }

    let(:ui_state) {
      {
        all: true,
        included_ids: [],
        excluded_ids: [],
        collection_id: c1.id
      }
    }

    before do
      CollectionsSample.create!(collection: c1, sample: s1)
      CollectionsSample.create!(collection: c1, sample: s2)
      CollectionsSample.create!(collection: c2, sample: s3)
    end

    it 'returns samples according to ui_state' do
      expect(Sample.for_ui_state(ui_state)).to match_array([s1, s2])
    end
  end



  context 'updating molfile' do


    let(:molfile) {
      <<-MOLFILE
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
    }
    let(:sample) { build(:sample, molfile: molfile) }
    let(:mol_attributes){
      {
        "boiling_point" => nil,
              "density" => 0.0,
             "inchikey" => "XLYOFNOQVPJJNP-UHFFFAOYSA-N",
        "inchistring" => "InChI=1S/H2O/h1H2",
          "iupac_name" => "oxidane",
       "melting_point" => nil,
   "molecular_weight" => 18.01528,
  #  "molecule_svg_file" => "XLYOFNOQVPJJNP-UHFFFAOYSA-N.svg", #todo
            "molfile" => molfile.rstrip,
              "names" => ["water", "oxidane"],
       "sum_formular" => "H2O"
     }
    }

    before do
      sample.collections << FactoryBot.build(:collection)
      sample.creator = FactoryBot.build(:person)
    end

    it 'should create a molecule' do
      sample.save!
      molecule = sample.molecule
      expect(molecule).to be_present
    end

    it 'should retrieve molecule information' do
      sample.save!
      molecule = sample.molecule
      mol_attributes.each do |k, v|
        expect(molecule.attributes[k]).to eq(v)
      end


    end

    ##Fixme : now file are anonymised
    #it 'should create the molecule svg file' do
    #  expect(File).to receive(:new).with('public/images/molecules/XLYOFNOQVPJJNP-UHFFFAOYSA-N.svg','w+').and_call_original
    #  sample.save
    #end

  end

  context 'count samples created by user' do
    let(:user) { create(:person)}

    before do
      3.times do
        create(:sample, creator: user)
      end
    end

    it 'should associate the samples with its creator' do
      expect(Sample.last.creator).to eq(user)
      expect(user.samples_created.count).to eq(3)
    end

    it 'should count samples created by user' do
      user.reload
      expect(user.counters['samples'].to_i).to eq(3)
    end
  end


  context 'count subsamples created per sample' do
    let(:sample) { create(:sample)}

    before do
      3.times do
        create(:sample, parent: sample)
      end
    end

    it 'should associate the subsamples with its parent' do
      expect(sample.children.count).to eq(3)
    end
  end

  describe 'unit conversion' do
    let(:sample) { create(:sample) }

    context 'given l & molarity' do
      before do
        sample.target_amount_value = 0.001991
        sample.target_amount_unit = 'l'
        sample.molarity_value = 1.23
        sample.density = 0
        sample.save!
      end

      it 'returns correct values' do
        expect(sample.amount_g.round(3)).to be(0.044)
        expect(sample.amount_ml.round(3)).to be(1.991)
        expect(sample.amount_mmol.round(3)).to be(2.449)
      end
    end

    context 'given l' do
      before do
        sample.target_amount_value = 0.002231
        sample.target_amount_unit = 'l'
        sample.molarity_value = 0
        sample.density = 0
        sample.save!
      end

      it 'returns correct values' do
        expect(sample.amount_g.round(3)).to be(0.0)
        expect(sample.amount_ml.round(3)).to be(2.231)
        expect(sample.amount_mmol.round(3)).to be(0.0)
      end
    end

    context 'given mol' do
      before do
        sample.target_amount_value = 0.00119
        sample.target_amount_unit = 'mol'
        sample.molarity_value = 0
        sample.density = 0
        sample.save!
      end

      it 'returns correct values' do
        expect(sample.amount_g.round(3)).to be(0.021)
        expect(sample.amount_ml.round(3)).to be(0.0)
        expect(sample.amount_mmol.round(3)).to be(1.19)
      end
    end
  end
end
