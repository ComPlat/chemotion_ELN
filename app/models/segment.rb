# == Schema Information
#
# Table name: segments
#
#  id               :integer          not null, primary key
#  segment_klass_id :integer
#  element_type     :string
#  element_id       :integer
#  properties       :jsonb
#  created_by       :integer
#  created_at       :datetime
#  updated_at       :datetime
#  deleted_at       :datetime
#

class Segment < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :segment_klass
  belongs_to :element, polymorphic: true
end
