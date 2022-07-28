# frozen_string_literal: true

require 'rails_helper'

describe 'Reporter::Docx::Document instance' do
  let(:svg_fixt_path) { Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg') }
  let(:svg_image_path) { Rails.root.join('public', 'images', 'molecules', 'molecule.svg') }

  let(:user) { create(:user) }
  let(:reaction1) { create(:reaction, name: 'title 1', collections: [collection]) }
  let(:reaction2) { create(:reaction, name: 'title 2', collections: [collection]) }
  let(:sample) { create(:sample, collections: [collection]) }
  let(:collection)  do
    create(:collection, user: user,
                        sample_detail_level: 10,
                        reaction_detail_level: 10,
                        wellplate_detail_level: 10,
                        screen_detail_level: 10,
                        permission_level: 10)
  end

  before do
    `ln -s #{svg_fixt_path} #{Rails.root.join('public', 'images', 'molecules')} ` unless File.exist?(svg_image_path)
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)

    serialized_objects = [
      Entities::ReactionReportEntity.represent(reaction1).serializable_hash,
      Entities::ReactionReportEntity.represent(reaction2).serializable_hash,
      Entities::SampleReportEntity.represent(sample).serializable_hash,
    ]

    instance = Reporter::Docx::Document.new(objs: serialized_objects,
                                            spl_settings: all_spl_settings,
                                            rxn_settings: all_rxn_settings,
                                            configs: all_configs,
                                            si_rxn_settings: all_si_rxn_settings)
    @content = instance.convert
  end

  after(:all) do
    fp = Rails.root.join('public', 'images', 'molecules', 'molecule.svg')
    FileUtils.rm(fp, force: true) if File.exist?(fp)
  end

  it 'returns an array class' do
    expect(@content.class).to eq(Array)
  end

  context '.reactions' do
    it 'has correct reaction titles' do
      expect(@content[0][:title]).to eq('title 1')
      expect(@content[1][:title]).to eq('title 2')
    end
  end

  context '.samples' do
    it 'has correct sample titles' do
      expect(@content[2][:title]).to include(sample.molecule_iupac_name)
    end
  end
end
