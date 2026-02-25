# frozen_string_literal: true

# == Schema Information
#
# Table name: elements_wellplates
#
#  id           :bigint           not null, primary key
#  deleted_at   :datetime
#  log_data     :jsonb
#  created_at   :datetime
#  updated_at   :datetime
#  element_id   :bigint           not null
#  wellplate_id :bigint           not null
#
# Indexes
#
#  index_elements_wellplates_on_element_id    (element_id)
#  index_elements_wellplates_on_wellplate_id  (wellplate_id)
#

class ElementsWellplate < ApplicationRecord
  acts_as_paranoid
  belongs_to :element, class_name: 'Labimotion::Element'
  belongs_to :wellplate
end
