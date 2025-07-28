# frozen_string_literal: true

module Entities
  class ReactionVariationEntity < ApplicationEntity
    expose(
      :id,
      :uuid,
      :properties,
      :metadata,
      :reactants,
      :products,
      :solvents,
    )
    expose :starting_materials, as: :startingMaterials

    def properties
      object[:properties].slice(:duration, :temperature).transform_values do |value|
        ReactionVariationPropertyEntity.represent(value)
      end
    end

    def metadata
      object[:metadata].slice(:notes, :analyses)
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
    expose :volume, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :yield, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :duration, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :temperature, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :concentration, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :turnoverNumber, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :turnoverFrequency, if: IS_GAS, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :aux, using: 'Entities::ReactionVariationMaterialAuxEntity'
  end

  class StartingMaterialEntity < ApplicationEntity
    expose :mass, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :amount, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :volume, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :equivalent, using: 'Entities::ReactionVariationMaterialEntryEntity'

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
      :density,
    )
  end

  class ReactionVariationMaterialEntryEntity < ApplicationEntity
    expose(
      :value,
      :unit,
    )
  end
end
