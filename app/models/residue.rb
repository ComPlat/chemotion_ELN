class Residue < ActiveRecord::Base

  belongs_to :sample

  TYPES = Hash[*%i(polymer residue).collect { |v| [ v, v ] }.flatten]

  def self.find_or_create_by_molfile molfile
    sample_name = self.generate_an_identifier molfile
  end
end
