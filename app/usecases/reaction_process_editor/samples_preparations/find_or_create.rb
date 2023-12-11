# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module SamplesPreparations
      class FindOrCreate
        def self.execute!(reaction_process:, sample_preparation:)
          preparation = reaction_process.samples_preparations.find_by(id: sample_preparation['id']) ||
                        reaction_process.samples_preparations.find_or_initialize_by(sample_id: sample_preparation['sample_id'])
          preparation.update(sample_preparation.except(:id))
        end
      end
    end
  end
end
