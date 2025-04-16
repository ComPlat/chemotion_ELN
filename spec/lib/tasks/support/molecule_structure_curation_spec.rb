# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('lib/tasks/support/molecule_structure_curation.rb')

describe MoleculeStructureCuration do
  let(:instance) { described_class.new }

  describe '.process' do
    let(:sample_map) { build(:sample_map_pc400) }

    # rubocop:disable RSpec/MultipleExpectations
    it 'curates molecule and sample entries' do
      allow(PubChem).to receive(:get_record_from_inchikey).and_return(nil)
      molecule_ids = sample_map.keys
      molecule_count = molecule_ids.size
      sample_ids = sample_map.values.flatten.map(&:id)

      expect(Molecule.where(id: molecule_ids).count).to eq(molecule_count)
      expect(Sample.where(id: sample_ids).count).to eq(sample_ids.count)
      instance.process
      expect(instance.faulty_molecules).to be_empty
      expect(Sample.where(molecule_id: molecule_ids).count).to be(0)
      expect(instance.faulty_samples).to be_empty
    end
    # rubocop:enable RSpec/MultipleExpectations
  end
end
