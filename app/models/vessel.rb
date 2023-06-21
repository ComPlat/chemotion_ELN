# == Schema Information
#
# Table name: vessels
#
#  id                 :bigint           not null, primary key
#  vessel_template_id :bigint
#  user_id            :bigint
#  name               :string
#  short_label        :string
#  description        :string
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  deleted_at         :datetime
#
# Indexes
#
#  index_vessels_on_deleted_at  (deleted_at)
#
class Vessel < ApplicationRecord
  acts_as_paranoid

  belongs_to :vessel_template
  belongs_to :creator, class_name: "User", foreign_key: "user_id"

  has_many :collections_vessels, dependent: :destroy
  has_many :collections, through: :collections_vessels

end
