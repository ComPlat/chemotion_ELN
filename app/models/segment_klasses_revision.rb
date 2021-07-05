# == Schema Information
#
# Table name: segment_klasses_revisions
#
#  id                 :integer          not null, primary key
#  segment_klass_id   :integer
#  uuid               :string
#  properties_release :jsonb
#  released_at        :datetime
#  released_by        :integer
#  created_by         :integer
#  created_at         :datetime
#  updated_at         :datetime
#  deleted_at         :datetime
#
# Indexes
#
#  index_segment_klasses_revisions_on_segment_klass_id  (segment_klass_id)
#

class SegmentKlassesRevision < ApplicationRecord
  acts_as_paranoid
  has_one :segment_klass

end
