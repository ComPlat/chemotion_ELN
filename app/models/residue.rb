class Residue < ActiveRecord::Base

  belongs_to :sample

  before_create :set_default_properties

  TYPES = Hash[*%i(polymer residue).collect { |v| [ v, v ] }.flatten]
  DEFAULT_PROPERTIES = {
    polymer: %i(loading polymer_type formula)
  }

  def self.find_or_create_by_molfile molfile
    sample_name = self.generate_an_identifier molfile

  end

private

  def set_default_properties
    DEFAULT_PROPERTIES[self.residue_type.to_sym].each do |key|
      self.custom_info[key] ||= nil
    end
    if self.custom_info.has_key? :polymer_type
      self.custom_info[:polymer_type] = 'polystyrene'
    end
  end
end
