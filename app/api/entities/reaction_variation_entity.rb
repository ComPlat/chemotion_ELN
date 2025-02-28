# frozen_string_literal: true

module Entities
  class ReactionVariationEntity < ApplicationEntity
    expose(
      :id,
      :properties,
      :metadata,
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

    def metadata
      {}.tap do |metadata|
        metadata[:notes] = object[:metadata][:notes]
        metadata[:analyses] = object[:metadata][:analyses]
      end
    end

    def materials(material_type, entity)
      {}.tap do |materials|
        object[material_type]&.each do |k, v|
          materials[k] = entity.represent(v)
        end
      end
    end

    def starting_materials
      materials(:startingMaterials, StartingMaterialEntity)
    end

    def reactants
      materials(:reactants, StartingMaterialEntity)
    end

    def products
      materials(:products, ProductMaterialEntity)
    end

    def solvents
      materials(:solvents, SolventMaterialEntity)
    end
  end

  class ReactionVariationPropertyEntity < ApplicationEntity
    expose(
      :value,
      :unit,
    )
  end

  class SolventMaterialEntity < ApplicationEntity
    expose :volume, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :aux, using: 'Entities::ReactionVariationMaterialAuxEntity'
  end

  class ProductMaterialEntity < ApplicationEntity
    IS_GAS = ->(object, _) { (object[:aux][:gasType] == 'gas') }.freeze

    expose :mass, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :amount, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :yield, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :duration, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :temperature, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :concentration, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :turnoverNumber, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :turnoverFrequency, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :aux, using: 'Entities::ReactionVariationMaterialAuxEntity'
  end

  class StartingMaterialEntity < ApplicationEntity
    IS_FEEDSTOCK = ->(object, _) { (object[:aux][:gasType] == 'feedstock') }.freeze

    expose :mass, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :amount, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :equivalent, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :volume, if: IS_FEEDSTOCK, using: 'Entities::ReactionVariationMaterialEntryEntity'

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
      :gasType,
      :vesselVolume,
      :materialType,
    )
  end

  class ReactionVariationMaterialEntryEntity < ApplicationEntity
    expose(
      :value,
      :unit,
    )
  end
end
