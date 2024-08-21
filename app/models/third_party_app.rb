# frozen_string_literal: true

# == Schema Information
#
# Table name: third_party_apps
#
#  id         :bigint           not null, primary key
#  url        :string
#  name       :string(100)      not null
#  file_types :string(100)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_third_party_apps_on_name  (name) UNIQUE
#
class ThirdPartyApp < ApplicationRecord
  validates :name, presence: true, uniqueness: true, length: { maximum: 100 }
  validates :url, presence: true, uniqueness: true, length: { maximum: 100 }
  validates :file_types, presence: true
end
