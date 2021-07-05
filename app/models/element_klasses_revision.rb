# == Schema Information
#
# Table name: element_klasses_revisions
#
#  id                 :integer          not null, primary key
#  element_klass_id   :integer
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
#  index_element_klasses_revisions_on_element_klass_id  (element_klass_id)
#

class ElementKlassesRevision < ApplicationRecord
  acts_as_paranoid
  has_one :element_klass
end
