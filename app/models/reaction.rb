require 'ElementUIStateScopes'

class Reaction < ActiveRecord::Base
  include ElementUIStateScopes
  include PgSearch
  include Collectable

  # search related
  pg_search_scope :search_by_reaction_name, against: :name

  scope :by_name, ->(query) { where('name ILIKE ?', "%#{query}%") }


  has_many :collections_reactions
  has_many :collections, through: :collections_reactions

  has_many :reactions_starting_material_samples
  has_many :starting_materials, through: :reactions_starting_material_samples, source: :sample

  has_many :reactions_reactant_samples
  has_many :reactants, through: :reactions_reactant_samples, source: :sample

  has_many :reactions_product_samples
  has_many :products, through: :reactions_product_samples, source: :sample

  has_many :literatures

  before_destroy :destroy_associations

  def destroy_associations
    # WARNING: Using delete_all instead of destroy_all due to PG Error
    # TODO: Check this error and consider another solution
    Literature.where(reaction_id: id).delete_all
    CollectionsReaction.where(reaction_id: id).delete_all
    ReactionsProductSample.where(reaction_id: id).delete_all
    ReactionsReactantSample.where(reaction_id: id).delete_all
    ReactionsStartingMaterialSample.where(reaction_id: id).delete_all
  end

  def samples
    starting_materials + reactants + products
  end
end
