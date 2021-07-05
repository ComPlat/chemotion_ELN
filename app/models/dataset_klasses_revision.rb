# == Schema Information
#
# Table name: dataset_klasses_revisions
#
#  id                 :integer          not null, primary key
#  dataset_klass_id   :integer
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
#  index_dataset_klasses_revisions_on_dataset_klass_id  (dataset_klass_id)
#

class DatasetKlassesRevision < ApplicationRecord
  acts_as_paranoid
  has_one :dataset_klass

end
