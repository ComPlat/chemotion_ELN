# frozen_string_literal: true

# == Schema Information
#
# Table name: cellline_samples
#
#  id                   :bigint           not null, primary key
#  amount               :bigint
#  ancestry             :string           default("/"), not null
#  contamination        :string
#  deleted_at           :datetime
#  description          :string
#  name                 :string
#  passage              :integer
#  short_label          :string
#  unit                 :string
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  cellline_material_id :bigint
#  cellline_sample_id   :bigint
#  user_id              :bigint
#
# Indexes
#
#  index_cellline_samples_on_ancestry  (ancestry) WHERE (deleted_at IS NULL)
#
class CelllineSample < ApplicationRecord
  acts_as_paranoid
  has_ancestry orphan_strategy: :adopt

  include ElementUIStateScopes
  include Taggable
  include Collectable
  include PgSearch::Model

  has_one :container, as: :containable
  has_many :collections_celllines, inverse_of: :cellline_sample, dependent: :destroy
  has_many :collections, through: :collections_celllines

  belongs_to :cell_line_sample, optional: true
  belongs_to :cellline_material
  belongs_to :creator, class_name: 'User', foreign_key: 'user_id'

  has_many :sync_collections_users, through: :collections

  after_create :create_root_container

  scope :by_sample_name, lambda { |query, collection_id|
                           joins(:collections).where(collections: { id: collection_id })
                                              .where('name ILIKE ?', "%#{sanitize_sql_like(query)}%")
                         }

  scope :by_material_name, lambda { |query, collection_id|
    joins(:cellline_material)
      .joins(:collections)
      .where('collections.id=?', collection_id)
      .where('cellline_materials.name ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }

  def create_root_container
    self.container = Container.create_root_container if container.nil?
  end
end
# rubocop:enable Rails/InverseOf, Rails/HasManyOrHasOneDependent
