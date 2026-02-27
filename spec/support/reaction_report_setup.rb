# frozen_string_literal: true

RSpec.shared_context 'reaction report setup' do
  def create_reaction_report(reaction, sample)
    gas_phase_data = {
      'part_per_million' => 900_000_0,
      'temperature' => { unit: 'K', value: 306 },
      'time' => { unit: 'h', value: 2 },
      'turnover_frequency' => { unit: 'TON/h', value: 0.000007688 },
      'turnover_number' => 0.00001538,
    }
    CollectionsReaction.create!(reaction: reaction, collection: collection)

    CollectionsSample.find_or_create_by(sample_id: sample.id, collection_id: collection.id)
    ReactionsProductSample.find_or_create_by(
      reaction: reaction,
      sample: sample,
      equivalent: equiv,
      position: 2,
      gas_type: 3,
      gas_phase_data: gas_phase_data,
    )
    Entities::ReactionReportEntity.represent(
      reaction,
      current_user: build(:user),
      detail_levels: ElementDetailLevelCalculator.new(user: user, element: reaction).detail_levels,
    ).serializable_hash
  end
end
