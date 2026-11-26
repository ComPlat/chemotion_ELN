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

  has_one :container, as: :containable, inverse_of: :containable, dependent: :nullify
  has_many :collections_celllines, inverse_of: :cellline_sample, dependent: :destroy
  has_many :collections, through: :collections_celllines

  belongs_to :cell_line_sample, optional: true
  belongs_to :cellline_material
  belongs_to :creator, foreign_key: :user_id, class_name: 'User', inverse_of: :cellline_samples

  after_create :create_root_container

  scope :name_like, ->(query) { where('cellline_samples.name ILIKE ?', "%#{sanitize_sql_like(query)}%") }
  scope :material_name_like, lambda { |query|
    joins(:cellline_material).where('cellline_materials.name ILIKE ?', "%#{sanitize_sql_like(query)}%")
  }
  scope :by_sample_name, ->(query, collection_id) { by_collection_id(collection_id).name_like(query) }
  scope :by_material_name, ->(query, collection_id) { by_collection_id(collection_id).material_name_like(query) }

  multisearchable against: %i[name]

  def create_root_container
    self.container = Container.create_root_container if container.nil?
  end
end
