# == Schema Information
#
# Table name: molecule_names
#
#  id          :integer          not null, primary key
#  molecule_id :integer
#  user_id     :integer
#  description :text
#  name        :string           not null
#  deleted_at  :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
# Indexes
#
#  index_molecule_names_on_deleted_at               (deleted_at)
#  index_molecule_names_on_molecule_id              (molecule_id)
#  index_molecule_names_on_name                     (name)
#  index_molecule_names_on_user_id                  (user_id)
#  index_molecule_names_on_user_id_and_molecule_id  (user_id,molecule_id)
#

class MoleculeName < ApplicationRecord
  acts_as_paranoid

  belongs_to :user, optional: true
  belongs_to :molecule, optional: true

  has_many :samples

  # Blocks C0/C1 control chars, bidi overrides (U+202A-U+202E, U+2066-U+2069),
  # and zero-width/invisible chars (U+200B-U+200D, U+FEFF).
  SAFE_NAME_REGEX = /\A[^\x00-\x1f\x7f\u0080-\u009f\u200b-\u200d\u202a-\u202e\u2066-\u2069\ufeff]+\z/.freeze

  validates :name, format: { with: SAFE_NAME_REGEX, message: :invalid_characters }
end
