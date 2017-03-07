require 'rails_helper'

describe 'Reporter::Docx::Document instance' do
  let!(:user) { create(:user) }
  let!(:t1) { "title 1" }
  let!(:t2) { "title 2" }
  let!(:r1) { create(:reaction, name: t1)}
  let!(:r2) { create(:reaction, name: t2)}
  let!(:s1) { create(:sample) }
  let!(:c)  { create(:collection, user: user,
                                  sample_detail_level: 10,
                                  reaction_detail_level: 10,
                                  wellplate_detail_level: 10,
                                  screen_detail_level: 10,
                                  permission_level: 10) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    CollectionsSample.create!(sample: s1, collection: c)
    CollectionsReaction.create!(reaction: r1, collection: c)
    CollectionsReaction.create!(reaction: r2, collection: c)
    [r1, r2, s1].each(&:reload)

    objs_hash = [r1, r2, s1].map do |o|
      ElementReportPermissionProxy.new(user, o, [user.id]).serialized
    end

    instance = Reporter::Docx::Document.new(objs: objs_hash,
                spl_settings: all_spl_settings,
                rxn_settings: all_rxn_settings,
                configs: all_configs)
    @content = instance.convert
  end

  it "returns an array class" do
    expect(@content.class).to eq(Array)
  end

  context '.reactions' do
    it "has correct reaction titles" do
      expect(@content[0][:title]).to eq(t1)
      expect(@content[1][:title]).to eq(t2)
    end
  end

  context '.samples' do
    it "has correct sample titles" do
      expect(@content[2][:title]).to include(s1.molecule_iupac_name)
    end
  end
end
