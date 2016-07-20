module ReactionLevelSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Reaction.new.base_attributes
    has_many :starting_materials
    has_many :reactants
    has_many :solvents
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
      MaterialDecorator.new(object.reactions_starting_material_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
    end

    def reactants
      MaterialDecorator.new(object.reactions_reactant_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
    end

    def solvents
      MaterialDecorator.new(object.reactions_solvent_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample]}".constantize.new(s, @nested_dl).serializable_hash }
    end

    def products
      MaterialDecorator.new(object.reactions_product_samples).decorated.map{ |s| "MaterialSerializer::Level#{@nested_dl[:sample] || 0}".constantize.new(s, @nested_dl).serializable_hash }
    end
  end

  class_methods do
    def define_restricted_methods_for_level(level)
      (DetailLevels::Reaction.new.base_attributes - DetailLevels::Reaction.new.public_send("level#{level}_attributes")).each do |attr|
        define_method(attr) do
          case attr
          when :analysis_kinds
            nil
          else
            '***'
          end
        end
      end
    end
  end
end
