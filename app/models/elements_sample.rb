# == Schema Information
#
# Table name: elements_samples
#
#  id         :integer          not null, primary key
#  element_id :integer
#  sample_id  :integer
#  created_by :integer
#  created_at :datetime
#  updated_at :datetime
#  deleted_at :datetime
#
# Indexes
#
#  index_elements_samples_on_element_id  (element_id)
#  index_elements_samples_on_sample_id   (sample_id)
#


class ElementsSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :element
  belongs_to :sample
end
