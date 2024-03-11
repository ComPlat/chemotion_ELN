# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    class ReactionProcessStepEntity < Grape::Entity
      expose(
        :id, :name, :position, :locked, :reaction_process_id, :reaction_id,
        :label, :final_conditions, :select_options
      )

      expose :actions, using: 'Entities::ReactionProcessEditor::ReactionProcessActivityEntity'

      expose :reaction_process_vessel, using: 'Entities::ReactionProcessEditor::ReactionProcessVesselEntity'

      private

      def select_options
        {
          transferable_samples: transfer_samples_options,
          transferable_to: transfer_to_options,
          added_materials: added_materials_options,
          removable_materials: removable_materials_options,
          mounted_equipment: mounted_equipment_options,
        }
      end

      def reaction
        object.reaction
      end

      def actions
        object.reaction_process_activities.order('position')
      end

      def reaction_process_id
        object.reaction_process_id
      end

      def reaction_id
        reaction.id
      end

      def added_materials_options
        # For the ProcessStepHeader in the UI, in order of actions.
        object.reaction_process_activities.order(:position).filter_map do |action|
          if action.activity_name == 'ADD'
            added_material_option = sample_option(action.sample || action.medium, action.workup['acts_as'])
            added_material_option.merge(amount: action.workup['target_amount'])
          end
        end.uniq
      end

      def removable_materials_options
        # For UI selects to REMOVE only previously added materials, scoped to acts_as.
        {
          SOLVENT: samples_acts_as_options('SOLVENT'),
          MEDIUM: samples_acts_as_options('MEDIUM'),
          ADDITIVE: samples_acts_as_options('ADDITIVE'),
          DIVERSE_SOLVENT: samples_acts_as_options('DIVERSE_SOLVENT'),
        }
      end

      # This is too big for "options" and should probably move to its own entity ("SampleOptionEntity")?
      # We also have sample_options in the ReactionProcessEntity which contain only :value, :label.
      def sample_option(sample, acts_as)
        {
          id: sample.id,
          value: sample.id,
          # Can we unify this? Using preferred_labels as in most ELN which in turn is an attribute derived from
          # `external_label` but when a sample is saved it gets it's "short_label" set. This is quite irritating.
          label: sample.preferred_label || sample.short_label,
          amount: {
            value: sample.target_amount_value,
            unit: sample.target_amount_unit,
          },
          unit_amounts: {
            mmol: sample.amount_mmol,
            mg: sample.amount_mg,
            ml: sample.amount_ml,
          },
          sample_svg_file: sample&.sample_svg_file,
          acts_as: acts_as,
        }
      end

      def mounted_equipment_options
        options_for(mounted_equipment)
      end

      def transfer_samples_options
        @transfer_samples_options ||=
          Sample.where(id: transferable_sample_ids).includes(%i[
                                                               molecule molecule_name residues
                                                             ]).map do |sample|
            sample_option(sample, 'SAMPLE')
          end
      end

      def transfer_to_options
        object.siblings.map do |process_step|
          { value: process_step.id,
            label: process_step.label,
            saved_sample_ids: process_step.saved_sample_ids }
        end
      end

      def transferable_sample_ids
        @transferable_sample_ids ||= object.reaction_process.saved_sample_ids
      end

      def mounted_equipment
        object.reaction_process_activities.map do |action|
          if action.activity_name == 'CONDITION'
            action.workup && action.workup['EQUIPMENT'].try(:[], 'value')
          else
            action.workup && action.workup['equipment']
          end
        end.flatten.uniq.compact
      end

      def samples_acts_as_options(acts_as)
        object.added_materials(acts_as).map do |sample|
          sample_option(sample, acts_as)
        end
      end

      def options_for(string_array)
        string_array.map do |string|
          { value: string, label: string.titlecase }
        end
      end
    end
  end
end
