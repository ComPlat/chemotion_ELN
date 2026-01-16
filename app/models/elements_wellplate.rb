# frozen_string_literal: true

# == Schema Information
#
# Table name: elements_wellplates
#
#  element_id   :bigint           not null
#  wellplate_id :bigint           not null
#  id           :bigint           not null, primary key
#  created_at   :datetime
#  updated_at   :datetime
#  deleted_at   :datetime
#  log_data     :jsonb
#
# Indexes
#
#  index_elements_wellplates_on_element_id   (element_id)
#  index_elements_wellplates_on_wellplate_id (wellplate_id)
#

class ElementsWellplate < ApplicationRecord
  acts_as_paranoid
  belongs_to :element, class_name: 'Labimotion::Element'
  belongs_to :wellplate

  scope :get_wellplates, lambda { |element_ids|
    where(element_id: element_ids)
      .pluck(:wellplate_id).compact.uniq
  }

  scope :get_elements, lambda { |wellplate_ids|
    where(wellplate_id: wellplate_ids)
      .pluck(:element_id).compact.uniq
  }
end
