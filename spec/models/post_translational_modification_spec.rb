# frozen_string_literal: true

# == Schema Information
#
# Table name: post_translational_modifications
#
#  id                                 :bigint           not null, primary key
#  acetylation_enabled                :boolean          default(FALSE), not null
#  acetylation_lysin_number           :float
#  deleted_at                         :datetime
#  glycosylation_enabled              :boolean          default(FALSE), not null
#  glycosylation_n_linked_asn_details :string           default("")
#  glycosylation_n_linked_asn_enabled :boolean          default(FALSE), not null
#  glycosylation_o_linked_lys_details :string           default("")
#  glycosylation_o_linked_lys_enabled :boolean          default(FALSE), not null
#  glycosylation_o_linked_ser_details :string           default("")
#  glycosylation_o_linked_ser_enabled :boolean          default(FALSE), not null
#  glycosylation_o_linked_thr_details :string           default("")
#  glycosylation_o_linked_thr_enabled :boolean          default(FALSE), not null
#  hydroxylation_enabled              :boolean          default(FALSE), not null
#  hydroxylation_lys_details          :string           default("t")
#  hydroxylation_lys_enabled          :boolean          default(FALSE), not null
#  hydroxylation_pro_details          :string           default("t")
#  hydroxylation_pro_enabled          :boolean          default(FALSE), not null
#  methylation_arg_details            :string           default("")
#  methylation_arg_enabled            :boolean          default(FALSE), not null
#  methylation_enabled                :boolean          default(FALSE), not null
#  methylation_glu_details            :string           default("")
#  methylation_glu_enabled            :boolean          default(FALSE), not null
#  methylation_lys_details            :string           default("")
#  methylation_lys_enabled            :boolean          default(FALSE), not null
#  other_modifications_details        :string           default("")
#  other_modifications_enabled        :boolean          default(FALSE), not null
#  phosphorylation_enabled            :boolean          default(FALSE), not null
#  phosphorylation_ser_details        :string           default("")
#  phosphorylation_ser_enabled        :boolean          default(FALSE), not null
#  phosphorylation_thr_details        :string           default("")
#  phosphorylation_thr_enabled        :boolean          default(FALSE), not null
#  phosphorylation_tyr_details        :string           default("")
#  phosphorylation_tyr_enabled        :boolean          default(FALSE), not null
#  created_at                         :datetime         not null
#  updated_at                         :datetime         not null
#
# Indexes
#
#  idx_sbmm_ptm_deleted_at  (deleted_at)
#
require 'rails_helper'

RSpec.describe PostTranslationalModification do
  it { is_expected.to have_many(:sequence_based_macromolecules).dependent(nil) }

  describe '.attributes_for_sbmm_uniqueness' do
    subject(:attributes) { described_class.attributes_for_sbmm_uniqueness }

    it 'only lists existing columns' do
      expect(attributes.map(&:to_s) - described_class.column_names).to be_empty
    end

    it 'includes every *_enabled flag and the acetylation lysin number' do
      enabled_flags = described_class.column_names.select { |name| name.end_with?('_enabled') }.map(&:to_sym)

      expect(attributes).to match_array(enabled_flags + [:acetylation_lysin_number])
    end

    it 'excludes the free-text *_details columns' do
      expect(attributes.map(&:to_s)).not_to include(a_string_ending_with('_details'))
    end
  end

  describe 'persistence' do
    it 'stores the enabled flags and details from the factory' do
      ptm = create(:post_translational_modification).reload

      expect(ptm).to have_attributes(phosphorylation_enabled: true, phosphorylation_ser_details: 'Something something')
    end

    it 'defaults the hydroxylation details to "t"' do
      expect(described_class.new).to have_attributes(hydroxylation_lys_details: 't', hydroxylation_pro_details: 't')
    end
  end
end
