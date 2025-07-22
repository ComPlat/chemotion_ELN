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

      def find_or_create_sbmm(sbmm_json, sbmm_uuid, parent_id)
        ptm_id = sbmm_json['post_translational_modification_id']
        psm_id = sbmm_json['protein_sequence_modification_id']
        sbmm = SequenceBasedMacromolecule.new(
          sbmm_json.except('parent_id', 'post_translational_modification_id', 'protein_sequence_modification_id'),
        )
        sbmm.parent_id = parent_id

        if ptm_id.present?
          ptm_json = @data.fetch('PostTranslationalModification', {})[ptm_id]
          sbmm.post_translational_modification = PostTranslationalModification.new(ptm_json)
        end
        if psm_id.present?
          psm_json = @data.fetch('ProteinSequenceModification', {})[psm_id]
          sbmm.protein_sequence_modification = ProteinSequenceModification.new(psm_json)
        end

        existing_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(sbmm)
        if existing_sbmm.present?
          update_instances!(sbmm_uuid, existing_sbmm)
          return existing_sbmm.id
        end

        sbmm.save
        update_instances!(sbmm_uuid, sbmm)
        sbmm.id
      end

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
