# == Schema Information
#
# Table name: datasets_revisions
#
#  id         :integer          not null, primary key
#  dataset_id :integer
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
#  index_datasets_revisions_on_dataset_id  (dataset_id)
#

class DatasetsRevision < ApplicationRecord
  acts_as_paranoid
  has_one :dataset

end
