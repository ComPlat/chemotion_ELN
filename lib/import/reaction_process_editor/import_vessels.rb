# frozen_string_literal: true

module Import
  module ReactionProcessEditor
    class ImportVessels
      ROOT_DIR = ENV.fetch('REACTION_PROCESS_EDITOR_DATA_DIR', 'tmp/reaction_process_editor')
      FILES = 'vessels/*.csv'

      # File format constants as discussed and defined with PHodapp, NJung, cbuggle, 18.11.2024
      MODE_SEPARATOR = ';'

      def execute
        ActiveRecord::Base.transaction do
          ontology_files.each do |filename|
            CSV.foreach(filename, col_sep: ';', headers: true, return_headers: false,
                                  converters: [->(string) { string&.strip }]) do |row|
              User.where(type: 'Person').find_each do |person|
                create_from_csv(row, person)
              end
            end
          end
        end
      end

      private

      # def set_all_inactive
      #   ::ReactionProcessEditor::Ontology.update_all(active: false)
      # end

      def create_from_csv(csv, current_user) # rubocop:disable Metrics/AbcSize
        short_label = csv['ShortLabel']
        return if short_label.blank?

        vessel_template = VesselTemplate.find_or_initialize_by(name: csv['Name'])

        vessel = Vessel.find_or_initialize_by(vessel_template: vessel_template, short_label: short_label,
                                              creator: current_user)

        amount, unit = csv['Vol.'].scan(/(.*) (.*)/)[0]

        vessel_template.update!(
          vessel_type: csv['Type'],
          material_type: csv['Material'],
          volume_amount: amount,
          volume_unit: unit,
          automation_modes: csv['Mode'].split(MODE_SEPARATOR),
        )

        if csv['Vessel/Template'] == 'Vessel'
          Rails.logger.info("importing #{short_label}")
          # TODO: Vessel model has no "mode" yet (though csv has).
          vessel.name = short_label
          vessel.creator = current_user
          vessel.save!
        end
      rescue StandardError => e
        Rails.logger.error("Failed to import Vessel with short_label: #{short_label}: \n #{e.inspect}")
        Rails.logger.error(vessel&.errors&.full_messages)
        Rails.logger.error(vessel_template&.errors&.full_messages)
      end

      def ontology_files
        Rails.root.glob("#{ROOT_DIR}/#{FILES}")
      end
    end
  end
end
