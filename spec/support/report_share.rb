# frozen_string_literal: true

RSpec.shared_examples 'Rinchi Xlsx/Csv formats' do
  it 'has correct values' do
    [product_1, product_2].each_with_index do |product, line_offset|
      _, _, _, inchistring, inchikey, long_key, web_key, short_key =
        report_file.sheet(0).row(4 + line_offset)

      expect(inchistring).to eq(product.molecule.inchistring)
      expect(inchikey).to eq(product.molecule.inchikey)
      expect(long_key).to eq(reaction.rinchi_long_key)
      expect(web_key).to eq(reaction.rinchi_web_key)
      expect(short_key).to eq(reaction.rinchi_short_key)
    end
  end
end

RSpec.shared_context 'Report shared declarations', shared_context: :metadata do
  let(:user) { create(:user) }
  let(:collection) do
    create(
      :collection,
      user: user,
      sample_detail_level: 10,
      reaction_detail_level: 10,
      wellplate_detail_level: 10,
      screen_detail_level: 10,
      permission_level: 10
    )
  end
  let(:starting_material_1) do
    create(:sample, molfile: File.read('./spec/fixtures/rinchi/esterifica/rct_01.mol'), collections: [collection])
  end
  let(:starting_material_2) do
    create(:sample, molfile: File.read('./spec/fixtures/rinchi/esterifica/rct_02.mol'), collections: [collection])
  end
  let(:product_1) do
    create(:sample, molfile: File.read('./spec/fixtures/rinchi/esterifica/prd_01.mol'), collections: [collection])
  end
  let(:product_2) do
    create(:sample, molfile: File.read('./spec/fixtures/rinchi/esterifica/prd_02.mol'), collections: [collection])
  end
  let(:solvent) do
    create(:sample, molfile: File.read('./spec/fixtures/rinchi/esterifica/agt_01.mol'), collections: [collection])
  end
  let(:reaction) do
    create(:reaction, name: 'title 1', collections: [collection])
  end
  let(:serialized_reaction) do
    Entities::ReactionReportEntity.represent(
      reaction,
      detail_levels: ElementDetailLevelCalculator.new(user: user, element: reaction).detail_levels,
      serializable: true
    )
  end
  let(:report_file) do
    tempfile = Tempfile.new(['rspec', file_extension])
    described_class.new(objs: [serialized_reaction]).create(tempfile.path)
    Roo::Spreadsheet.open(tempfile.path)
  end

  before do
    reaction.reactions_starting_material_samples.create(sample: starting_material_1, equivalent: 0.88)
    reaction.reactions_starting_material_samples.create(sample: starting_material_2, equivalent: 0.88)
    reaction.reactions_product_samples.create(sample: product_1, equivalent: 0.88)
    reaction.reactions_product_samples.create(sample: product_2, equivalent: 0.88)
    reaction.reactions_solvent_samples.create(sample: solvent, equivalent: 0.88)
  end
end
