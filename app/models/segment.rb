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
#  uuid             :string
#  klass_uuid       :string
#

class Segment < ApplicationRecord
  acts_as_paranoid
  include GenericRevisions

  belongs_to :segment_klass
  belongs_to :element, polymorphic: true
  has_many :segments_revisions, dependent: :destroy
end
