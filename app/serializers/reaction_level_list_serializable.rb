module ReactionLevelListSerializable
  extend ActiveSupport::Concern

  included do
    [
      :starting_materials,
      :reactants,
      :solvents,
      :products, # :literatures
    ].each do |attr|
      define_method(attr) do
        []
      end
    end
  end

  class_methods do
    def list_restricted_methods
      DetailLevels::Reaction.new.list_removed_attributes.each do |attr|
        define_method(attr) do
          nil
        end
      end
    end
  end
end
