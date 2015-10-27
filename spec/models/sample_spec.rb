require 'rails_helper'

RSpec.describe Sample, type: :model do

  describe 'creation' do
    let(:sample) { create(:sample) }

    it 'is possible to create a valid sample' do
      expect(sample.valid?).to be(true)
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
      CollectionsSample.create!(sample: sample, collection: collection)
      ReactionsStartingMaterialSample.create!(sample: sample, reaction: reaction_1)
      ReactionsReactantSample.create!(sample: sample, reaction: reaction_1)
      ReactionsProductSample.create!(sample: sample, reaction: reaction_2)
      sample.destroy
      wellplate.reload
    end

    it 'destroys associations properly' do
      expect(collection.collections_samples).to eq []
      expect(reaction_1.reactions_starting_material_samples).to eq []
      expect(reaction_2.reactions_reactant_samples).to eq []
      expect(reaction_2.reactions_product_samples).to eq []
      expect(wellplate.wells).to eq []
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

  context 'with molecule' do
    let(:sample) { build(:sample) }
    let(:molecule) { create(:molecule) }

    it 'should belong to a sample' do
      sample.molecule = molecule
      sample.save

      persisted_sample = Sample.last
      expect(persisted_sample.molecule).to eq molecule
    end
  end

  context 'updating molfile' do
    let(:sample) { build(:sample, molfile: molfile) }

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

    it 'should create a molecule' do
      sample.save
      molecule = sample.molecule
      expect(molecule).to be_present
    end

    it 'should retrive molecule information' do
      sample.save
      molecule = sample.molecule
      expect(molecule.attributes).to include(
             "inchikey" => "XLYOFNOQVPJJNP-UHFFFAOYSA-N",
          "inchistring" => "InChI=1S/H2O/h1H2",
              "density" => nil,
     "molecular_weight" => 18.01528,
              "molfile" => molfile,
        "melting_point" => nil,
        "boiling_point" => nil,
                "names" => ["hydron;hydroxide"],
           "iupac_name" => "hydron;hydroxide",
    "molecule_svg_file" => "XLYOFNOQVPJJNP-UHFFFAOYSA-N.svg"
      )
    end

    it 'should create the molecule svg file' do
      expect(File).to receive(:new).with('public/images/molecules/XLYOFNOQVPJJNP-UHFFFAOYSA-N.svg','w+').and_call_original
      sample.save
    end

  end

  context 'count samples created by user' do
    let(:user) { create(:user)}

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
      expect(user.samples_created_count).to eq(3)
    end
  end
end
