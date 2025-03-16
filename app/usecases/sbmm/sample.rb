# frozen_string_literal: true

module Usecases
  module Sbmm
    class Sample
      def create(params)
        sbmm = Create.new.find_or_create_by(params[:sequence_based_macromolecule_attributes])
        sample = SequenceBasedMacromoleculeSample.new(params.except(:sequence_based_macromolecule_attributes))
        sample.sequence_based_macromolecule = sbmm
        sample.save!

        sample
      end
    end
  end
end
