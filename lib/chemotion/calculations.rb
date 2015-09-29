module Chemotion::Calculations

  class Molecular
    attr_accessor :molecule

    def initialize molecule
      self.molcule = molecule
    end

    #converts an amount from a unit to an other for specific molecule
    def convert_amount amount:, from_unit:, to_unit:
      {
        amount_value: '100.5',
        unit: 'ml'
      }
    end
  end

end
