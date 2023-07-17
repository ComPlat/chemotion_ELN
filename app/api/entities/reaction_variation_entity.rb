# frozen_string_literal: true

module Entities
  class ReactionVariationEntity < ApplicationEntity
    expose(
      :id,
      :properties,
      :startingMaterials,
      :reactants,
      :products,
    )

    def properties
      {}.tap do |properties|
        properties[:temperature] = ReactionVariationPropertyEntity.represent(object[:properties][:temperature])
        properties[:duration] =  ReactionVariationPropertyEntity.represent(object[:properties][:duration])
      end
    end

    def materials(material_type)
      {}.tap do |materials|
        object[material_type].each do |k, v|
          materials[k] = ReactionVariationMaterialEntity.represent(v)
        end
      end
    end

    def startingMaterials
      materials(:startingMaterials)
    end

    def reactants
      materials(:reactants)
    end

    def products
      materials(:products)
    end
  end

  class ReactionVariationPropertyEntity < ApplicationEntity
    expose(
      :value,
      :unit,
    )
  end

  class ReactionVariationMaterialEntity < ApplicationEntity
    expose(
      :value,
      :unit,
      :aux,
    )

    def aux
      {}.tap do |aux|
        aux[:coefficient] = object[:aux][:coefficient]
        aux[:isReference] = object[:aux][:isReference]
        aux[:referenceAmount] = object[:aux][:referenceAmount]
        aux[:loading] = object[:aux][:loading]
        aux[:purity] = object[:aux][:purity]
        aux[:molarity] = object[:aux][:molarity]
        aux[:molecularWeight] = object[:aux][:molecularWeight]
        aux[:sumFormula] = object[:aux][:sumFormula]
        aux[:yield] = object[:aux][:yield]
      end
    end
  end
end
