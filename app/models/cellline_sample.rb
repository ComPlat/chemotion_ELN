# frozen_string_literal: true

# == Schema Information
#
# Table name: cellline_samples
#
#  id                   :bigint           not null, primary key
#  cellline_material_id :bigint
#  cellline_sample_id   :bigint
#  amount               :bigint
#  unit                 :string
#  passage              :integer
#  contamination        :string
#  name                 :string
#  description          :string
#  user_id              :bigint
#  deleted_at           :datetime
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  short_label          :string
#
# rubocop:disable Rails/InverseOf, Rails/HasManyOrHasOneDependent
class CelllineSample < ApplicationRecord
  acts_as_paranoid

  include ElementUIStateScopes
  include Taggable
  include Collectable

  has_one :container, as: :containable
  has_many :collections_celllines, inverse_of: :cellline_sample, dependent: :destroy
  has_many :collections, through: :collections_celllines

  belongs_to :cell_line_sample, optional: true
  belongs_to :cellline_material
  belongs_to :creator, class_name: 'User', foreign_key: 'user_id'

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
end
# rubocop:enable Rails/InverseOf, Rails/HasManyOrHasOneDependent
