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
    expose :mass, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :amount, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :yield, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :duration, if: lambda { |object, _| object[:aux][:gasType] == 'gas' }, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :temperature, if: lambda { |object, _| object[:aux][:gasType] == 'gas' }, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :concentration, if: lambda { |object, _| object[:aux][:gasType] == 'gas' }, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :turnoverNumber, if: lambda { |object, _| object[:aux][:gasType] == 'gas' }, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :turnoverFrequency, if: lambda { |object, _| object[:aux][:gasType] == 'gas' }, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :aux, using: 'Entities::ReactionVariationMaterialAuxEntity'
  end

  class StartingMaterialEntity < ApplicationEntity
    expose :mass, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :amount, using: 'Entities::ReactionVariationMaterialEntryEntity'
    expose :equivalent, using: 'Entities::ReactionVariationMaterialEntryEntity'

    expose :volume, if: lambda { |object, _| (object[:aux][:gasType] == 'feedstock') }, using: 'Entities::ReactionVariationMaterialEntryEntity'

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
