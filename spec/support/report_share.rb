RSpec.shared_examples 'Rinchi Xlsx/Csv formats' do
  it 'has correct values' do
    [@sp_prd_a, @sp_prd_b].each_with_index do |prd, idx|
      _, _, _, inchi, inchikey, l_key, w_key, s_key =
        @target.sheet(0).row(4 + idx)

      expect(inchi).to eq(prd.molecule.inchistring)
      expect(inchikey).to eq(prd.molecule.inchikey)
      expect(l_key).to eq(@r1.rinchi_long_key)
      expect(w_key).to eq(@r1.rinchi_web_key)
      expect(s_key).to eq(@r1.rinchi_short_key)
    end
  end
end

RSpec.shared_context 'Report shared declarations', shared_context: :metadata do
  def do_authentication
    @user = create(:user)
    allow_any_instance_of(
      WardenAuthentication
    ).to receive(:current_user).and_return(@user)
  end

  def set_collection
    @c = create(
      :collection,
      user: @user,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10,
      permission_level: 10
    )
  end

  def set_samples
    fp = './spec/fixtures/rinchi/esterifica/'
    @sp_rct_a = create(:sample, molfile: File.read(fp + 'rct_01.mol'))
    @sp_rct_b = create(:sample, molfile: File.read(fp + 'rct_02.mol'))
    @sp_prd_a = create(:sample, molfile: File.read(fp + 'prd_01.mol'))
    @sp_prd_b = create(:sample, molfile: File.read(fp + 'prd_02.mol'))
    @sp_agt_a = create(:sample, molfile: File.read(fp + 'agt_01.mol'))
  end

  def set_reaction
    t1 = 'title 1'
    @r1 = create(:reaction, name: t1)
  end

  def set_col_sample
    [@sp_rct_a, @sp_rct_b, @sp_prd_a, @sp_prd_b, @sp_agt_a].each do |s|
      CollectionsSample.create!(sample: s, collection: @c)
    end
  end

  def set_col_reaction
    equiv = 0.88
    CollectionsReaction.create!(reaction: @r1, collection: @c)
    ReactionsStartingMaterialSample.create!(
      reaction: @r1, sample: @sp_rct_a, equivalent: equiv
    )
    ReactionsStartingMaterialSample.create!(
      reaction: @r1, sample: @sp_rct_b, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: @r1, sample: @sp_prd_a, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: @r1, sample: @sp_prd_b, equivalent: equiv
    )
    ReactionsSolventSample.create!(
      reaction: @r1, sample: @sp_agt_a, equivalent: equiv
    )
  end

  def serialize_reaction
    @obj_hash = [@r1].map { |o|
      ElementReportPermissionProxy.new(@user, o, [@user.id]).serialized
    }
  end

  before do
    do_authentication
    set_collection
    set_samples
    set_reaction

    set_col_sample
    set_col_reaction

    serialize_reaction
  end
end
