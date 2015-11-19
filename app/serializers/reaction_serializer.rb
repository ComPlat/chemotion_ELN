class Material < Sample
  attr_accessor :reference, :equivalent
end

class MaterialSerializer < SampleSerializer
  attributes :reference, :equivalent
end

class MaterialSerializer::Level0 < SampleSerializer::Level0
  attributes :reference, :equivalent
end

class MaterialSerializer::Level1 < SampleSerializer::Level1
  attributes :reference, :equivalent
end

class MaterialSerializer::Level2 < SampleSerializer::Level2
  attributes :reference, :equivalent
end

class MaterialSerializer::Level3 < SampleSerializer::Level3
  attributes :reference, :equivalent
end

class ReactionSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :name, :created_at, :updated_at, :description, :timestamp_start, :timestamp_stop,
             :observation, :purification, :dangerous_products, :solvent, :tlc_solvents, :tlc_description,
             :rf_value, :temperature, :status, :reaction_svg_file, :analysis_kinds

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
    attributes :id, :type, :is_restricted, :observation, :description

    has_many :starting_materials
    has_many :reactants
    has_many :products

    alias_method :original_initialize, :initialize

    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def type
      'reaction'
    end

    def is_restricted
      true
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
