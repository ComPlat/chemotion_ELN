# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcesses
      class FindOrCreate
        def self.execute!(reaction:)
          reaction_process = reaction.reaction_process || reaction.create_reaction_process(automation_ordinal: 0)

          Usecases::ReactionProcessEditor::Provenances::FindOrCreate.execute!(reaction_process: reaction_process)
          reaction_process
        end
      end
    end
  end
end
