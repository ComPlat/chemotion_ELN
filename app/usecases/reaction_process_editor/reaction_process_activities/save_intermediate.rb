module Usecases
  module ReactionProcessEditor
    module ReactionProcessActivities
      class SaveIntermediate
        def self.execute!(activity:, workup:)
          sample = Sample.find_by(id: workup['sample_id']) || Sample.new(decoupled: true, creator: activity.creator,
                                                                         molecule: Molecule.find_or_create_dummy)

          sample.collections << (activity.reaction.collections - sample.collections)

          sample.hide_in_eln = workup['hide_in_eln']

          sample.short_label = workup['short_label'].presence&.strip
          sample.name = workup['name'].presence&.strip
          sample.description = workup['description'].presence&.strip
          sample.target_amount_value = workup['target_amount'] && workup['target_amount']['value'].to_f
          sample.target_amount_unit = workup['target_amount'] && workup['target_amount']['unit']
          sample.purity = workup['purity'].to_f
          sample.location = workup['location']

          sample.save!

          # Keep sample.external_label and workup in sync with potentially auto-generated short_label
          sample.update(external_label: sample.short_label)
          activity.workup['short_label'] = sample.short_label

          activity.workup['sample_id'] = sample.id
          activity.save!

          ris = ReactionsIntermediateSample.find_or_create_by(reaction: activity.reaction,
                                                              sample: sample,
                                                              reaction_process_step_id: activity.reaction_process_step_id)
          ris.update(intermediate_type: workup['intermediate_type'])
        end
      end
    end
  end
end
