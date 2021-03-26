module UnitConvertable
  extend ActiveSupport::Concern

  def convert_to_unit amount_g, unit, m = false
    val = if self.contains_residues
      case unit
      when 'g'
        amount_g
      when 'mol'
        (self.loading * amount_g) / 1000.0 # loading is always in mmol/g
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
          amount_g / (density * 1000)
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
    if self.contains_residues
      case unit
      when 'g'
        value
      when 'mg'
        value / 1000.0
      when 'mol'
        value / loading * 1000.0 rescue 0.0
      else
        value
      end
    else
      case unit
      when 'g'
        value;
      when 'mg'
        value / 1000.0;
      when 'l'
        if has_molarity
          mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
          value * molarity_value * mol_weight
        elsif has_density
          value * (density || 1.0) * 1000
        else
          0
        end
      when 'mol'
        mol_weight = (decoupled? ? molecular_mass : molecule.molecular_weight) || 0
        value / (purity || 1.0) * mol_weight
      else
        value
      end
    end
  end

  def amount_mmol(type = 'target')
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    return value * 1000 if unit == 'mol'

    val_g = self.convert_to_gram(value, unit)
    self.convert_to_unit(val_g, 'mol', true)
  end

  def amount_mg(type = 'target')
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = self.convert_to_gram(value, unit) * 1000.0
  end

  def amount_g(type = 'target')
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = self.convert_to_gram(value, unit)
  end

  def amount_ml(type = 'target')
    return if self.molecule.is_partial

    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    return value * 1000 if unit == 'l'

    val_g = self.convert_to_gram(value, unit)
    self.convert_to_unit(val_g, 'l', true)
  end
end
