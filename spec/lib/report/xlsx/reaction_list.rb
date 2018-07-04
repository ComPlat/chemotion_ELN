require 'rails_helper'

describe 'Reporter::Xlsx::ReactionList instance' do
  let!(:user) { create(:user) }
  let!(:t1) { 'title 1' }
  let!(:r1) { create(:reaction, name: t1) }
  let!(:c)  {
    create(
      :collection,
      user: user,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10,
      permission_level: 10
    )
  }

  let(:fixtures_path) { './spec/fixtures/rinchi/esterifica/' }
  let(:rct_01) { File.read(fixtures_path + 'rct_01.mol') }
  let(:rct_02) { File.read(fixtures_path + 'rct_02.mol') }
  let(:prd_01) { File.read(fixtures_path + 'prd_01.mol') }
  let(:prd_02) { File.read(fixtures_path + 'prd_02.mol') }
  let(:agt_01) { File.read(fixtures_path + 'agt_01.mol') }
  let(:correct) { File.readlines(fixtures_path + 'rinchi.txt') }

  let(:sp_rct_01) { create(:sample, molfile: rct_01) }
  let(:sp_rct_02) { create(:sample, molfile: rct_02) }
  let(:sp_prd_01) { create(:sample, molfile: prd_01) }
  let(:sp_prd_02) { create(:sample, molfile: prd_02) }
  let(:sp_agt_01) { create(:sample, molfile: agt_01) }

  let(:t_xlsx) { Tempfile.new(['rspec', '.xlsx']) }
  let(:equiv)  { 0.88 }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    [sp_rct_01, sp_rct_02, sp_prd_01, sp_prd_02, sp_agt_01].each do |s|
      CollectionsSample.create!(sample: s, collection: c)
    end
    CollectionsReaction.create!(reaction: r1, collection: c)
    ReactionsStartingMaterialSample.create!(
      reaction: r1, sample: sp_rct_01, equivalent: equiv
    )
    ReactionsStartingMaterialSample.create!(
      reaction: r1, sample: sp_rct_02, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: r1, sample: sp_prd_01, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: r1, sample: sp_prd_02, equivalent: equiv
    )
    ReactionsSolventSample.create!(
      reaction: r1, sample: sp_agt_01, equivalent: equiv
    )
    [r1].each(&:reload)

    obj_hash = [r1].map { |o|
      ElementReportPermissionProxy.new(user, o, [user.id]).serialized
    }

    Reporter::Xlsx::ReactionList.new(objs: obj_hash).create_xlsx(t_xlsx.path)
  end

  it 'returns an array class' do
    target = Roo::Spreadsheet.open(t_xlsx.path)

    [sp_prd_01, sp_prd_02].each_with_index do |prd, idx|
      puts idx
      _, _, _, inchi, inchikey, l_key, w_key, s_key =
        target.sheet(0).row(4 + idx)

      expect(inchi).to eq(prd.molecule.inchistring)
      expect(inchikey).to eq(prd.molecule.inchikey)
      expect(l_key).to eq(r1.rinchi_long_key)
      expect(w_key).to eq(r1.rinchi_web_key)
      expect(s_key).to eq(r1.rinchi_short_key)
    end
  end
end
