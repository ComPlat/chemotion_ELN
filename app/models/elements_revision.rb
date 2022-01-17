# == Schema Information
#
# Table name: elements_revisions
#
#  id         :integer          not null, primary key
#  element_id :integer
#  uuid       :string
#  klass_uuid :string
#  name       :string
#  properties :jsonb
#  created_by :integer
#  created_at :datetime
#  updated_at :datetime
#  deleted_at :datetime
#
# Indexes
#
#  index_elements_revisions_on_element_id  (element_id)
#

class ElementsRevision < ApplicationRecord
  acts_as_paranoid
  has_one :element

end
