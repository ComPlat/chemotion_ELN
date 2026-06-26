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
#  ror_id       :string
#

class Affiliation < ApplicationRecord
  validates :organization, presence: true

  has_many :user_affiliations, dependent: :destroy
  has_many :users, through: :user_affiliations

  # Case/accent-insensitive key for matching near-duplicate free-text values.
  def self.normalize_key(value)
    return '' if value.blank?

    value.to_s
         .unicode_normalize(:nfkd)
         .gsub(/\p{Mn}/, '')
         .downcase
         .gsub(/[^a-z0-9]+/, ' ')
         .strip
  end

  # Returns the first-seen stored value matching value's normalized key, else value.
  def self.canonical(field, value)
    return value if value.blank?

    key = normalize_key(value)
    where.not(field => [nil, '']).distinct.pluck(field).find { |v| normalize_key(v) == key } || value
  end

  def output_array_full
    [group, department, organization, country]
  end

  def output_full
    output_array_full.map{|e| !e.blank? && e || nil}.compact.join(', ')
  end
end
