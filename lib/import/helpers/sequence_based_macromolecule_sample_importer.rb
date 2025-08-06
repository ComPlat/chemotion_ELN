# frozen_string_literal: true

module Import
  module Helpers
    class SequenceBasedMacromoleculeSampleImporter
      def initialize(data, current_user_id, instances)
        @data = data
        @current_user_id = current_user_id
        @instances = instances
      end

      def execute
        create_sequence_based_macromolecule_samples
      end

      def create_sequence_based_macromolecule_samples
        @data.fetch('SequenceBasedMacromoleculeSample', {}).each do |uuid, fields|
          sbmm_uuid = fields.fetch('sequence_based_macromolecule_id')
          sbmm_id = fetch_sbmm(sbmm_uuid)
          ancestry = @instances.dig('SequenceBasedMacromoleculeSample', fields['ancestry'])
          sbmm_sample = SequenceBasedMacromoleculeSample.create(
            fields.except('id', 'user_id', 'sequence_based_macromolecule_id', 'ancestry')
            .merge(
              user_id: @current_user_id,
              sequence_based_macromolecule_id: sbmm_id,
              ancestry: (ancestry.try(:id).present? ? "/#{ancestry.id}/" : '/'),
              collections: fetch_collection(uuid),
              container: Container.create_root_container,
            ),
          )
          update_instances!(uuid, sbmm_sample)
        end
      end

      def fetch_sbmm(sbmm_uuid)
        sbmm_json = @data.fetch('SequenceBasedMacromolecule', {})[sbmm_uuid]
        sbmm_parent_id = sbmm_json['parent_id']
        parent_id = nil

        if sbmm_parent_id.present?
          sbmm_parent_json = @data.fetch('SequenceBasedMacromolecule', {})[sbmm_parent_id]
          parent_id = find_or_create_sbmm(sbmm_parent_json, sbmm_parent_id, nil)
        end

        find_or_create_sbmm(sbmm_json, sbmm_uuid, parent_id)
      end

      # rubocop:disable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      def find_or_create_sbmm(sbmm_json, sbmm_uuid, parent_id)
        ptm_id = sbmm_json['post_translational_modification_id']
        psm_id = sbmm_json['protein_sequence_modification_id']

        sbmm_params =
          sbmm_json.except('parent_id', 'post_translational_modification_id', 'protein_sequence_modification_id')
                   .transform_keys(&:to_sym)
        sbmm_params[:parent_identifier] = parent_id if parent_id.present?
        sbmm_params[:post_translational_modification_attributes] = {}
        sbmm_params[:protein_sequence_modification_attributes] = {}

        if ptm_id.present?
          ptm_json = @data.fetch('PostTranslationalModification', {})[ptm_id]
          sbmm_params[:post_translational_modification_attributes] = ptm_json.transform_keys(&:to_sym)
        end
        if psm_id.present?
          psm_json = @data.fetch('ProteinSequenceModification', {})[psm_id]
          sbmm_params[:protein_sequence_modification_attributes] = psm_json.transform_keys(&:to_sym)
        end

        existing_or_new_sbmm = ::Usecases::Sbmm::Finder.new.find_or_initialize_by(sbmm_params)
        existing_or_new_sbmm.save if existing_or_new_sbmm.present? && existing_or_new_sbmm.new_record?

        update_instances!(sbmm_uuid, existing_or_new_sbmm)
        existing_or_new_sbmm.id
      end
      # rubocop:enable Metrics/AbcSize, Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

      def update_instances!(uuid, instance)
        type = instance.class.name
        @instances[type] = {} unless @instances.key?(type)
        @instances[type][uuid] = instance
      end

      def fetch_collection(uuid)
        associations = []
        @data.fetch('CollectionsSequenceBasedMacromoleculeSample', {}).each_value do |fields|
          next unless fields['sequence_based_macromolecule_sample_id'] == uuid

          instance = @instances.fetch('Collection', {})[fields['collection_id']]
          associations << instance unless instance.nil?
        end
        associations
      end
    end
  end
end
