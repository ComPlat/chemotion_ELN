# frozen_string_literal: true

class CelllineSample < ApplicationRecord
  acts_as_paranoid
  has_ancestry orphan_strategy: :adopt

  include ElementUIStateScopes
  include Taggable
  include Collectable

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
