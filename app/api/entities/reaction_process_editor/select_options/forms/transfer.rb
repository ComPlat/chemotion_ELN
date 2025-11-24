# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Forms
        class Transfer < Base
          def select_options_for(reaction_process:)
            {
              equipment: SelectOptions::Models::Equipment.new.all,
              transferable_samples: transferable_samples(reaction_process),
              targets: transfer_targets(reaction_process),
            }
          end

          private

          def transferable_samples(reaction_process)
            transferable = saved_samples(reaction_process) + [reaction_process.sample]

            transferable.filter_map do |sample|
              sample_info_option(sample, 'SAMPLE')
            end
          end

          def saved_samples(reaction_process)
            Sample.where(id: reaction_process.saved_sample_ids)
                  .includes(%i[molecule residues])
          end

          def transfer_targets(reaction_process)
            reaction_process.reaction_process_steps.map do |process_step|
              { value: process_step.id,
                label: process_step.label,
                saved_sample_ids: process_step.saved_sample_ids }
            end
          end
        end
      end
    end
  end
end
