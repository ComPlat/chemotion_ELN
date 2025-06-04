module SbmmSpecHelpers
  def serialize_sbmm_sample_as_api_input(sbmm_sample)
    data = Entities::SequenceBasedMacromoleculeSampleEntity.represent(sbmm_sample).serializable_hash
    data[:sequence_based_macromolecule].transform_keys! do |key|
      case key
      when :protein_sequence_modifications
        :protein_sequence_modification_attributes
      when :post_translational_modifications
        :post_translational_modification_attributes
      else
        key
      end
    end
    data.transform_keys! { |key| key == :sequence_based_macromolecule ? :sequence_based_macromolecule_attributes : key }
    parent_identifier = data[:sequence_based_macromolecule_attributes][:parent][:id]
    data[:sequence_based_macromolecule_attributes][:parent_identifier] = parent_identifier
    data[:sequence_based_macromolecule_attributes].delete(:parent)
    data
  end
end
