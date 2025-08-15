# frozen_string_literal: true

# == Schema Information
#
# Table name: cellline_samples
#
#  id                   :bigint           not null, primary key
#  amount               :bigint
#  ancestry             :string
#  contamination        :string
#  deleted_at           :datetime
#  description          :string
#  name                 :string
#  passage              :integer
#  short_label          :string
#  unit                 :string
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  cellline_material_id :bigint
#  cellline_sample_id   :bigint
#  user_id              :bigint
#
# Indexes
#
#  index_cellline_samples_on_ancestry  (ancestry)
#
require 'rails_helper'

RSpec.describe CelllineSample do
  let(:sample) { create(:cellline_sample) }

  context 'when empty cell line sample created' do
    it 'root container exists' do
      expect(sample.container).not_to be_nil
    end
  end
end
