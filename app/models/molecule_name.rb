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

  belongs_to :user
  belongs_to :molecule

  has_many :samples
end
