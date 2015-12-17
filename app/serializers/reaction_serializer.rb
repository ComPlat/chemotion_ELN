class ReactionSerializer < ActiveModel::Serializer
  include Labeled

  attributes *DetailLevels::Reaction.new.base_attributes

  has_many :starting_materials, serializer: MaterialSerializer
  has_many :reactants, serializer: MaterialSerializer
  has_many :products, serializer: MaterialSerializer

  has_many :literatures

  def starting_materials
    MaterialDecorator.new(object.reactions_starting_material_samples).decorated
  end

  def reactants
    MaterialDecorator.new(object.reactions_reactant_samples).decorated
  end

  def products
    MaterialDecorator.new(object.reactions_product_samples).decorated
  end

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'reaction'
  end

  def analysis_kinds
    products = object.products
    result_labels = {confirmed: {}, unconfirmed: {}, other: {}}
    products.each do |product|
      analyses = product.analyses
      analyses.inject(result_labels) { |result, analysis|
        if analysis["status"] == "Confirmed"
          if result[:confirmed][analysis["kind"]] then
            result[:confirmed][analysis["kind"]][:count] += 1
          else
            result[:confirmed][analysis["kind"]] = {
              label: analysis["kind"],
              count: 1
            }
          end
        elsif analysis["status"] == "Unconfirmed"
          if result[:unconfirmed][analysis["kind"]] then
            result[:unconfirmed][analysis["kind"]][:count] += 1
          else
            result[:unconfirmed][analysis["kind"]] = {
              label: analysis["kind"],
              count: 1
            }
          end
        else
          if result[:other][analysis["kind"]] then
            result[:other][analysis["kind"]][:count] += 1
          else
            result[:other][analysis["kind"]] = {
              label: analysis["kind"],
              count: 1
            }
          end
        end
        result
      }
    end
    result_labels
  end

  class Level0 < ActiveModel::Serializer
    include ReactionLevelSerializable
    define_restricted_methods_for_level(0)
  end
end

class ReactionSerializer::Level10 < ReactionSerializer
  has_many :starting_materials
  has_many :reactants
  has_many :products

  alias_method :original_initialize, :initialize

  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end

  def starting_materials
    MaterialDecorator.new(object.reactions_starting_material_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample]}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def reactants
    MaterialDecorator.new(object.reactions_reactant_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample]}".constantize.new(s, @nested_dl).serializable_hash }
  end

  def products
    MaterialDecorator.new(object.reactions_product_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample]}".constantize.new(s, @nested_dl).serializable_hash }
  end
end
