# frozen_string_literal: true

# == Schema Information
#
# Table name: media
#
#  id            :uuid             not null, primary key
#  molecule_name :string
#  name          :string
#  sum_formula   :string
#  type          :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#

module Medium
  class DiverseSolvent < ::Medium::Medium
  end
end
