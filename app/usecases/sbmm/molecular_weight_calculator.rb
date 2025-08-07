module Usecases
  module Sbmm
    class MolecularWeightCalculator
      attr_reader :sequence

      def initialize(sequence)
        @sequence = sequence
      end

      def calculate
        (sum_of_amino_acid_weights - (peptid_bindings * weights[:water_molecule])).round(2)
      end

      private

      def standardized_sequence
        sequence.upcase.gsub(/[^A-Z]/, '')
      end

      def sum_of_amino_acid_weights
        standardized_sequence.chars.reduce(0) { |result, letter| result += weights[letter.to_sym].to_f }
      end

      def peptid_bindings
        standardized_sequence.length - 1
      end

      def weights
        {
          A: 89.1,
          R: 174.2,
          N: 132.12,
          D: 133.1,
          C: 121.16,
          E: 147.13,
          Q: 146.15,
          G: 75.07,
          H: 155.16,
          I: 131.17,
          L: 131.17,
          K: 146.19,
          M: 149.21,
          F: 165.19,
          P: 115.13,
          S: 105.09,
          T: 119.12,
          W: 204.23,
          Y: 181.19,
          V: 117.15,
          water_molecule: 18.02
       }
      end
    end
  end
end
