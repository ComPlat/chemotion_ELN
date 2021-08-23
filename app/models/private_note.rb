# == Schema Information
#
# Table name: private_notes
#
#  id            :bigint           not null, primary key
#  content       :string
#  created_by    :integer          not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  noteable_id   :integer
#  noteable_type :string
#
# Indexes
#
#  index_private_note_on_user                            (created_by)
#  index_private_notes_on_noteable_type_and_noteable_id  (noteable_type,noteable_id)
#

class PrivateNote < ActiveRecord::Base
  belongs_to :noteable, polymorphic: true
  belongs_to :user, optional: true

  validates :noteable, presence: true
end
