# frozen_string_literal: true

SAMPLES_TYPES = %w[startingMaterials products reactants solvents].freeze

def migrate_aux(material, material_type)
  material['aux'].delete('yield')
  material['aux'].delete('equivalent')

  material['aux']['materialType'] ||= material_type
  material['aux']['gasType'] ||= 'off'
  material['aux']['vesselVolume'] ||= 0
end

def migrate_starting_material(material)
  # Transfer `equivalent` from `aux` to `equivalent` entry.
  equivalent = material['aux']['equivalent']
  material['equivalent'] ||= { 'value' => equivalent, 'unit' => nil }

  material.delete('volume') if material['aux']['gasType'] != 'feedstock'
end

def migrate_solvent(material)
  material.delete('mass')
  material.delete('amount')
end

def migrate_product(material)
  # Transfer `yield` from `aux` to `yield` entry.
  percent_yield = material['aux']['yield']
  material['yield'] ||= { 'value' => percent_yield, 'unit' => nil }

  material.delete('volume')
end

class AddGasMaterialsToReactionVariations < ActiveRecord::Migration[6.1]
  def up
    # Prior to this migration all materials have a `mass`, `amount`, and `volume` entry, irrespective of material type.
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        SAMPLES_TYPES.each do |key|
          variation[key].each_value do |material|
            case key
            when 'startingMaterials', 'reactants'
              migrate_starting_material(material)
            when 'solvents'
              migrate_solvent(material)
            when 'products'
              migrate_product(material)
            end
            migrate_aux(material, key)
          end
        end
      end
      reaction.update_column(:variations, variations)
    end
  end

  def down
    # After this migration all materials have a `mass`, `amount`, and `volume` entry, irrespective of material type.
    Reaction.where.not('variations = ?', '[]').find_each do |reaction|
      variations = reaction.variations
      variations.each do |variation|
        SAMPLES_TYPES.each do |key|
          variation[key].each_value do |material|
            material['aux'].delete('materialType')
            material['aux'].delete('gasType')
            material['aux'].delete('vesselVolume')

            percent_yield = material['yield']&.[]('value')
            material['aux']['yield'] ||= percent_yield
            material.delete('yield')

            equivalent = material['equivalent']&.[]('value')
            material['aux']['equivalent'] ||= equivalent
            material.delete('equivalent')

            material.delete('duration')
            material.delete('temperature')
            material.delete('concentration')
            material.delete('turnoverNumber')
            material.delete('turnoverFrequency')

            material['mass'] ||= { 'value' => 0, 'unit' => 'g' }
            material['amount'] ||= { 'value' => 0, 'unit' => 'mol' }
            material['volume'] ||= { 'value' => 0, 'unit' => 'l' }
          end
        end
      end
      reaction.update_column(:variations, variations)
    end
  end
end
