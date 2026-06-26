# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module ReactionProcesses
      class FindOrCreateByReaction
        def self.execute!(current_user:, reaction:)
          reaction_process = reaction.reaction_process || reaction.create_reaction_process(user: current_user)

          Usecases::ReactionProcessEditor::Provenances::FindOrCreate.execute!(reaction_process: reaction_process)
          reaction_process
        end
      end
    end
  end
end
