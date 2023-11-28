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
  class Medium < ApplicationRecord
    # STI Base Class for Medium::MediumSample, Medium::Additive, Medium::DiverseSolvent
    # self.abstract_class = true

    # We have alias methods basically because the ELN has a potpourri of attributes like
    # name, label, preferred_label, short_label and it sometimes is unclear which should
    # be used in the process editor.
    # We alias them in Medium as well because we do not want to distinguish models all the time.

    def short_label
      label
    end

    def preferred_label
      label
    end

    def name
      label
    end

    def target_amount_value; end
    def target_amount_unit; end
    def amount_mg; end
    def amount_mmol; end
    def amount_ml; end

    def sample_svg_file; end
  end
end
