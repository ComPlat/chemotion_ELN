class Residue < ActiveRecord::Base

  belongs_to :sample
  validate :loading_present

  TYPES = Hash[*%i(polymer residue).collect { |v| [ v, v ] }.flatten]

  def self.find_or_create_by_molfile molfile
    sample_name = self.generate_an_identifier molfile
  end

private

  def loading_present
    return false unless self.custom_info.is_a? Hash

    return true if self.custom_info['reaction_product']

    self.custom_info.has_key?('loading') && self.custom_info['loading'] != 0.0
  end
end
