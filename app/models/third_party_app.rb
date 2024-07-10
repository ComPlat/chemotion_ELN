# frozen_string_literal: true

class ThirdPartyApp < ApplicationRecord
  validates :name, presence: true, uniqueness: true, length: { maximum: 100 }
  validates :url, presence: true, uniqueness: true, length: { maximum: 100 }
  validates :file_type, presence: true
end
