# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliations
#
#  id           :integer          not null, primary key
#  company      :string
#  country      :string
#  organization :string
#  department   :string
#  group        :string
#  created_at   :datetime
#  updated_at   :datetime
#  from         :date
#  to           :date
#  domain       :string
#  cat          :string
#

class Affiliation < ApplicationRecord
  validates :organization, presence: true

  has_many :user_affiliations, dependent: :destroy
  has_many :users, through: :user_affiliations

  def output_array_full
    [group, department, organization, country]
  end

  def output_full
    output_array_full.map{|e| !e.blank? && e || nil}.compact.join(', ')
  end
end
