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
  # Falls back to the downcased original for non-Latin scripts, which the
  # a-z0-9 filter would otherwise collapse to an empty (all-equal) key.
  def self.normalize_key(value)
    return '' if value.blank?

    key = value.to_s
               .unicode_normalize(:nfkd)
               .gsub(/\p{Mn}/, '')
               .downcase
               .gsub(/[^a-z0-9]+/, ' ')
               .strip
    key.presence || value.to_s.downcase.strip
  end

  # Returns the first-seen stored value matching value's normalized key, else value.
  def self.canonical(field, value)
    return value if value.blank?

    key = normalize_key(value)
    match = nil
    where.not(field => [nil, '']).in_batches(of: 1_000) do |batch|
      match = batch.distinct.pluck(field).find { |v| normalize_key(v) == key }
      break if match
    end
    match || value
  end

  # Locks and destroys the row if no UserAffiliation references it anymore.
  def self.destroy_if_orphaned!(id)
    affiliation = lock.find_by(id: id)
    affiliation&.destroy! if affiliation && UserAffiliation.where(affiliation_id: id).empty?
  end

  def output_array_full
    [group, department, organization, country]
  end

  def output_full
    output_array_full.map{|e| !e.blank? && e || nil}.compact.join(', ')
  end
end
