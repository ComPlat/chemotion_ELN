module UnitConvertable
  extend ActiveSupport::Concern

  def convert_to_unit value, unit, milli = false
    val = if self.contains_residues
      case unit
      when 'g'
        value
      when 'mol'
        (self.loading * value) / 1000.0 # loading is always in mmol/g
      else
        value
      end
    else
      case unit
      when 'g'
        value
      when 'l'
        self.density || 1.0;
        if density
          value / density / 1000 ;
        end
      when 'mol'
        molecular_weight = self.molecule.molecular_weight
        if molecular_weight
          value * (self.purity || 1.0) / molecular_weight
        end
      else
        value
      end
    end

    if milli
      val * 1000
    else
      val
    end

  end

  def convert_to_gram value, unit
    if self.contains_residues
      case unit
      when 'g'
        value
      when 'mg'
        value / 1000.0;
      when 'mol'
        value / loading * 1000.0 rescue 0.0;
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
        value * (self.density || 1.0) * 1000;
      when 'mol'
        value / (self.purity || 1.0) * self.molecule.molecular_weight;
      else
        value
      end
    end
  end

  def amount_mmol type = 'target'
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = self.convert_to_gram(value, unit)
    self.convert_to_unit(val_g, 'mol', true)
  end

  def amount_mg type = 'target'
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = self.convert_to_gram(value, unit) * 1000.0
  end

  def amount_g type = 'target'
    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = self.convert_to_gram(value, unit)
  end

  def amount_ml type = 'target'
    return if self.molecule.is_partial

    value = self["#{type}_amount_value"] || 0.0
    unit = self["#{type}_amount_unit"]
    val_g = self.convert_to_gram(value, unit)
    self.convert_to_unit(val_g, 'l', true)
  end
end
