# frozen_string_literal: true

# == Schema Information
#
# Table name: media
#
#  id            :uuid             not null, primary key
#  sum_formula   :string
#  sample_name   :string
#  molecule_name :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  type          :string
#

module Medium
  class MediumSample < ::Medium::Medium
    def label
      sample_name || sum_formula
    end
  end
end
