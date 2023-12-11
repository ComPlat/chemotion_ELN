module UnitConvertable
  extend ActiveSupport::Concern

  def convert_to_unit(amount_g, unit, m = false)
    val = if contains_residues
            case unit
            when 'g'
              amount_g
            when 'mol'
              (loading * amount_g) / 1000.0 # loading is always in mmol/g
            else
              amount_g
            end
          else
            case unit
            when 'g'
              amount_g
            when 'l'
              if has_molarity
                mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
                secure_purity = purity || 1.0
                mol_weight.zero? ? 0 : (amount_g * secure_purity) / (molarity_value * mol_weight)
              elsif has_density
                begin
                  amount_g / (density * 1000)
                rescue StandardError
                  0
                end
              else
                0
              end
            when 'mol'
              mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
              mol_weight.zero? ? 0 : amount_g * (purity || 1.0) / mol_weight
            else
              amount_g
            end
          end

    if m
      (val || 0) * 1000
    else
      val
    end
  end

  def convert_to_gram(value, unit)
    if contains_residues
      case unit
      when 'g'
        value
      when 'mg'
        value / 1000.0
      when 'mol'
        begin
          value / loading * 1000.0
        rescue StandardError
          0.0
        end
      else
        value
      end
    else
      case unit
      when 'g'
        value
      when 'mg'
        value / 1000.0
      when 'l'
        if has_molarity
          mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
          value * molarity_value * mol_weight
        elsif has_density
          value * (density || 1.0) * 1000
        else
          0
        end
      when 'ml'
        if has_molarity
          mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
          value * molarity_value * mol_weight / 1000
        elsif has_density
          value * (density || 1.0)
        else
          0
        end
      when 'mol'
        mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
        value / (purity || 1.0) * mol_weight
      when 'mmol'
        mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
        value / (purity || 1.0) * mol_weight * 1000
      when 'mcmol'
        mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
        value / (purity || 1.0) * mol_weight * 1000 * 1000
      when 'nmol'
        mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
        value / (purity || 1.0) * mol_weight * 1000 * 1000 * 1000
      else
        value
      end
    end
  end

  def amount_mmol(type = 'target')
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"] || 'mmol'
    return value * 1000 if unit == 'mol'
    return value if unit == 'mmol'
    return value / 1000 if unit == 'mcmol'
    return value / (1000 * 1000) if unit == 'nmol'

    val_g = convert_to_gram(value, unit)
    convert_to_unit(val_g, 'mol', true)
  end

  def amount_mg(type = 'target')
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = convert_to_gram(value, unit) * 1000.0
  end

  def amount_g(type = 'target')
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = convert_to_gram(value, unit)
  end

  def amount_ml(type = 'target')
    return if molecule.is_partial

    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    return value * 1000 if unit == 'l'
    return value if unit == 'ml'

    val_g = convert_to_gram(value, unit)
    convert_to_unit(val_g, 'l', true)
  end
end
