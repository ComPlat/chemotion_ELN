# frozen_string_literal: true

module Entities
  class ReactionVariationEntity < ApplicationEntity
    expose(
      :id,
      :notes,
      :properties,
      :analyses,
      :reactants,
      :products,
      :solvents,
    )
    expose :starting_materials, as: :startingMaterials

    def properties
      {}.tap do |properties|
        properties[:temperature] = ReactionVariationPropertyEntity.represent(object[:properties][:temperature])
        properties[:duration] = ReactionVariationPropertyEntity.represent(object[:properties][:duration])
      end
    end

    def materials(material_type)
      {}.tap do |materials|
        object[material_type].each do |k, v|
          materials[k] = ReactionVariationMaterialEntity.represent(v)
        end
      end
    end

    def starting_materials
      materials(:startingMaterials)
    end

    def reactants
      materials(:reactants)
    end

    def products
      materials(:products)
    end

    def solvents
      materials(:solvents)
    end
  end

  class ReactionVariationPropertyEntity < ApplicationEntity
    expose(
      :value,
      :unit,
    )
  end

  class ReactionVariationMaterialEntity < ApplicationEntity
    expose :mass, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :amount, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :volume, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :aux, using: 'Entities::ReactionVariationMaterialAuxEntity'
  end

  class ReactionVariationMaterialAuxEntity < ApplicationEntity
    expose(
      :coefficient,
      :isReference,
      :loading,
      :purity,
      :molarity,
      :molecularWeight,
      :sumFormula,
      :yield,
      :equivalent,
    )
  end

  class ReactionVariationMaterialEntryEntity < ApplicationEntity
    expose(
      :value,
      :unit,
    )
  end
end
