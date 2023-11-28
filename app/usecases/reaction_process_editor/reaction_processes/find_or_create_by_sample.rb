# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcesses
      class FindOrCreateBySample
        def self.execute!(current_user:, sample:)
          reaction_process = sample.reaction_process || sample.create_reaction_process(user: current_user)

          Usecases::ReactionProcessEditor::Provenances::FindOrCreate.execute!(reaction_process: reaction_process)
          reaction_process
        end
      end
    end
  end
end
