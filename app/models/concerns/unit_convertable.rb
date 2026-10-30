module UnitConvertable
  extend ActiveSupport::Concern

  def convert_to_unit amount_g, unit, m = false
    if sample_type == Sample::SAMPLE_TYPE_MIXTURE && unit == 'mol'
      weight = mixture_relative_molecular_weight
      return nil unless weight

      return amount_g / weight * (m ? 1000 : 1)
    end
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
          mol_weight = (decoupled? ? molecular_mass : molecule&.molecular_weight) || 0
          secure_purity = purity || 1.0
          mol_weight.zero? ? 0 : (amount_g * secure_purity) / (molarity_value * mol_weight)
        elsif has_density
          amount_g / (density * 1000)
        else
          0
        end
      when 'mol'
        mol_weight = (decoupled? ? molecular_mass : molecule&.molecular_weight) || 0
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
        value
      when 'mg'
        value / 1000.0
      when 'l'
        if has_molarity
          mol_weight = (decoupled? ? molecular_mass : molecule&.molecular_weight) || 0
          value * molarity_value * mol_weight
        elsif has_density
          value * (density || 1.0) * 1000
        else
          0
        end
      when 'mol'
        convert_moles_to_gram(value)
      else
        value
      end
    end
  end

  def calculate_feedstock_mmol(value, unit)
    return 0 if value <= 0

    case unit
    when 'g'
      ## feedstock in mmol = g * 1000 / molecular weight (g/mol)
      value * 1000 / molecule.molecular_weight
    when 'l'
      purity_factor = purity || 1.0
      ideal_gas_constant = 0.0821
      default_temp_k = 294.0
      (value * purity_factor * 1000) / (ideal_gas_constant * default_temp_k)
    end
  end

  def amount_mmol(type = 'target', gas_type = nil)
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    return value * 1000 if unit == 'mol'

    if gas_type == 'feedstock' && %w[l g].include?(unit)
      calculate_feedstock_mmol(value, unit)
    else
      val_g = self.convert_to_gram(value, unit)
      self.convert_to_unit(val_g, 'mol', true)
    end
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
    return if self.molecule&.is_partial

    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    return value * 1000 if unit == 'l'

    val_g = self.convert_to_gram(value, unit)
    self.convert_to_unit(val_g, 'l', true)
  end

  # Relative MW includes the whole mixture's solvent mass and component purity.
  def mixture_relative_molecular_weight
    reference = components.find { |component| component.component_properties['reference'] == true } ||
                components.min_by { |component| component.position.to_i }
    properties = reference ? reference.component_properties : {}
    weight = Float(properties['relative_molecular_weight'], exception: false)
    weight if weight.to_f.positive? && weight.to_f.finite?
  end

  private

  def convert_moles_to_gram(value)
    return value * (mixture_relative_molecular_weight || 0) if sample_type == Sample::SAMPLE_TYPE_MIXTURE

    mol_weight = (decoupled? ? molecular_mass : molecule&.molecular_weight) || 0
    # Match the UI's default for nil/zero purity instead of dividing by zero.
    secure_purity = purity.to_f.zero? ? 1.0 : purity
    value / secure_purity * mol_weight
  end
end
