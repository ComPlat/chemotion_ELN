class Residue < ActiveRecord::Base

  belongs_to :sample

  TYPES = Hash[*%i(polymer residue).collect { |v| [ v, v ] }.flatten]
  DEFAULT_PROPERTIES = {
    polymer: %i(loading polymer_type formula)
  }

  def self.find_or_create_by_molfile molfile
    sample_name = self.generate_an_identifier molfile
  end
end
