# frozen_string_literal: true

# == Schema Information
#
# Table name: protein_sequence_modifications
#
#  id                              :bigint           not null, primary key
#  deleted_at                      :datetime
#  modification_c_terminal         :boolean          default(FALSE), not null
#  modification_c_terminal_details :string           default("")
#  modification_deletion           :boolean          default(FALSE), not null
#  modification_deletion_details   :string           default("")
#  modification_insertion          :boolean          default(FALSE), not null
#  modification_insertion_details  :string           default("")
#  modification_mutation           :boolean          default(FALSE), not null
#  modification_mutation_details   :string           default("")
#  modification_n_terminal         :boolean          default(FALSE), not null
#  modification_n_terminal_details :string           default("")
#  modification_other              :boolean          default(FALSE), not null
#  modification_other_details      :string           default("")
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#
# Indexes
#
#  idx_sbmm_psm_deleted_at  (deleted_at)
#
require 'rails_helper'

RSpec.describe ProteinSequenceModification do
  it { is_expected.to have_many(:sequence_based_macromolecules).dependent(nil) }

  describe '.attributes_for_sbmm_uniqueness' do
    subject(:attributes) { described_class.attributes_for_sbmm_uniqueness }

    it 'lists exactly the boolean modification flags' do
      flags = described_class.columns.select { |column| column.type == :boolean }.map { |column| column.name.to_sym }

      expect(attributes).to match_array(flags)
    end

    it 'excludes the free-text *_details columns' do
      expect(attributes.map(&:to_s)).not_to include(a_string_ending_with('_details'))
    end
  end

  describe 'associated sequence based macromolecules' do
    it 'keeps the macromolecules linked through protein_sequence_modification_id' do
      sbmm = create(:non_uniprot_sbmm)
      modification = sbmm.protein_sequence_modification

      expect(modification.sequence_based_macromolecules).to contain_exactly(sbmm)
    end
  end
end
