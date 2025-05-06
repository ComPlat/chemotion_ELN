# frozen_string_literal: true

class Versioning::Reverters::ChemicalReverter < Versioning::Reverters::BaseReverter
  def self.scope
    Chemical
  end

  def field_definitions
    {
      chemical_data: handle_json,
    }.with_indifferent_access
  end

  private

  def handle_json
    lambda do |value|
      return [{}] if value.blank?

      value.split("\n").map { |data| JSON.parse(data.gsub('=>', ':').gsub('nil', 'null')) }
    end
  end
end
