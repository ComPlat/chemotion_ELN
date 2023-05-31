# frozen_string_literal: true

# == Schema Information
#
# Table name: collection_acls
#
#  id                        :bigint           not null, primary key
#  user_id                   :integer          not null
#  collection_id             :integer          not null
#  label                     :string
#  permission_level          :integer          default(0)
#  sample_detail_level       :integer          default(0)
#  reaction_detail_level     :integer          default(0)
#  wellplate_detail_level    :integer          default(0)
#  screen_detail_level       :integer          default(0)
#  researchplan_detail_level :integer          default(10)
#  element_detail_level      :integer          default(10)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#
# Indexes
#
#  index_collection_acls_on_collection_id  (collection_id)
#  index_collection_acls_on_user_id        (user_id)
#

class CollectionAcl < ApplicationRecord
  PERMISSION_LEVELS_KEYS = %i[
    permission_level
    sample_detail_level
    reaction_detail_level
    wellplate_detail_level
    screen_detail_level
    researchplan_detail_level
    element_detail_level
  ].freeze

  PERMISSION_LEVELS_MAX = {
    permission_level: 5,
    sample_detail_level: 10,
    reaction_detail_level: 10,
    wellplate_detail_level: 10,
    screen_detail_level: 10,
    researchplan_detail_level: 10,
    element_detail_level: 10,
  }.freeze

  PERMISSION_LEVELS_OPTIONS = {
    permission_level: [
      {
        # Read
        value: 0,
        label: 'Read Only',
        description: 'Can view the collection and its contents, but cannot edit or delete anything.',
      },
      {
        # Write
        value: 1,
        label: 'Read and Edit',
        description: 'Can view the collection and its contents, and can edit or delete anything.',
      },
      {
        # Share
        value: 2,
        label: 'Read, Edit, and Share',
        description: 'Can also share the collection with other users.',
      },
      {
        # Delete
        value: 3,
        label: 'Read, Edit, Share, and Delete',
        description: 'Can also delete the collection.',
      },
      {
        # Import
        value: 4,
        label: 'Read, Edit, Share, Delete, and Administer',
        description: 'Can also administer the collection, including changing permissions for other users.',
      },
      {
        # Pass Ownership
        value: 5,
        label: 'Read, Edit, Share, Delete, Administer, and Pass Ownership',
        description: 'Can also pass ownership of the collection to another user.',
      },
    ],
    sample_detail_level: [],
    reaction_detail_level: [],
    wellplate_detail_level: [],
    screen_detail_level: [],
    researchplan_detail_level: [],
    element_detail_level: [],
  }.freeze

  belongs_to :user
  belongs_to :collection

  scope :shared_with, ->(user_id) { where(user_id: user_id) }

  validates :permission_level, presence: true,
                               numericality: {
                                 only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 5
                               }
  validates :sample_detail_level, presence: true,
                                  numericality: {
                                    only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10
                                  }
  validates :reaction_detail_level, presence: true,
                                    numericality: {
                                      only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10
                                    }
  validates :wellplate_detail_level, presence: true,
                                     numericality: {
                                       only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10
                                     }
  validates :screen_detail_level, presence: true,
                                  numericality: {
                                    only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10
                                  }
  validates :researchplan_detail_level, presence: true,
                                        numericality: {
                                          only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10
                                        }
  validates :element_detail_level, presence: true,
                                   numericality: {
                                     only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 10
                                   }

  def self.permission_levels_keys
    PERMISSION_LEVELS_KEYS
  end

  def self.permission_levels_max
    PERMISSION_LEVELS_MAX
  end

  def self.permission_levels_options
    PERMISSION_LEVELS_OPTIONS
  end

  def self.permission_levels_from_collections(collection_id, user_id)
    maxima = where(collection_id: collection_id, user_id: user_id).pluck(*PERMISSION_LEVELS_KEYS).transpose.map(&:max)
    PERMISSION_LEVELS_KEYS.zip(maxima).to_h
  end
end
