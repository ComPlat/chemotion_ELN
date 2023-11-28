# frozen_string_literal: true

module Usecases
  module ReactionProcessEditor
    module Samples
      class UpdateIntermediateAmountsInWorkup
        def self.execute!(sample:)
          sample.reactions_intermediate_samples.each do |reactions_sample|
            activity = reactions_sample.reaction_process_activity

            next unless activity

            target_amount = ::ReactionProcessEditor::SampleAmountsConverter.to_rpe(sample)

            sample_workup = { short_label: sample.short_label,
                              intermediate_type: reactions_sample.intermediate_type,
                              target_amount: target_amount,
                              purity: { value: sample.purity },
                              name: sample.name }.stringify_keys

            activity.workup = activity.workup.merge(sample_workup)
            activity.save!
          end
        end
      end
    end
  end
end
