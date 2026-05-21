# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/IndexedLet, RSpec/BeforeAfterAll
describe 'Reporter::Docx::Document' do
  let(:svg_fixt_path) { Rails.root.join('spec/fixtures/images/molecule.svg') }
  let(:svg_image_path) { Rails.public_path.join('images/molecules/molecule.svg') }

  let(:user) { create(:user) }
  let(:reaction1) { create(:reaction, name: 'title 1', collections: [collection]) }
  let(:reaction2) { create(:reaction, name: 'title 2', collections: [collection]) }
  let(:sample) { create(:sample, collections: [collection]) }
  let(:current_user) { build(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:serialized_objects) do
    [
      Entities::ReactionReportEntity.represent(
        reaction1,
        current_user: current_user,
        detail_levels: ElementDetailLevelCalculator.new(user: user, element: reaction1).detail_levels,
      ).serializable_hash,
      Entities::ReactionReportEntity.represent(
        reaction2,
        current_user: current_user,
        detail_levels: ElementDetailLevelCalculator.new(user: user, element: reaction2).detail_levels,
      ).serializable_hash,
      Entities::SampleReportEntity.represent(
        sample,
        current_user: current_user,
        detail_levels: ElementDetailLevelCalculator.new(user: user, element: sample).detail_levels,
      ).serializable_hash,
    ]
  end
  let(:instance) do
    Reporter::Docx::Document.new(objs: serialized_objects,
                                 spl_settings: all_spl_settings,
                                 rxn_settings: all_rxn_settings,
                                 configs: all_configs,
                                 si_rxn_settings: all_si_rxn_settings)
  end

  before do
    `ln -s #{svg_fixt_path} #{Rails.public_path.join('images/molecules')} ` unless File.exist?(svg_image_path)
  end

  after(:all) do
    fp = Rails.public_path.join('images/molecules/molecule.svg')
    FileUtils.rm(fp, force: true)
  end

  it 'returns an array class' do
    expect(instance.convert.class).to eq(Array)
  end

  describe '.reactions' do
    it 'has correct reaction titles' do
      expect(instance.convert[0][:title]).to eq('title 1')
      expect(instance.convert[1][:title]).to eq('title 2')
    end
  end

  describe '.samples' do
    it 'has correct sample titles' do
      expect(instance.convert[2][:title]).to include(sample.molecule_iupac_name)
    end
  end
end
# rubocop:enable RSpec/IndexedLet, RSpec/BeforeAfterAll
