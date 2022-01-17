# == Schema Information
#
# Table name: segments_revisions
#
#  id         :integer          not null, primary key
#  segment_id :integer
#  uuid       :string
#  klass_uuid :string
#  properties :jsonb
#  created_by :integer
#  created_at :datetime
#  updated_at :datetime
#  deleted_at :datetime
#
# Indexes
#
#  index_segments_revisions_on_segment_id  (segment_id)
#

class SegmentsRevision < ApplicationRecord
  acts_as_paranoid
  has_one :segment

end
