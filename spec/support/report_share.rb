# frozen_string_literal: true

RSpec.shared_examples 'Rinchi Xlsx/Csv formats' do
  it 'has correct values' do
    [product1, product2].each_with_index do |product, line_offset|
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
  let(:collection) { create(:collection, user: user) }
  let(:starting_material1) do
    create(:sample, molfile: build(:molfile, type: '../../rinchi/esterifica/rct_01'), collections: [collection])
  end
  let(:starting_material2) do
    create(:sample, molfile: build(:molfile, type: '../../rinchi/esterifica/rct_02'), collections: [collection])
  end
  let(:product1) do
    create(:sample, molfile: build(:molfile, type: '../../rinchi/esterifica/prd_01'), collections: [collection])
  end
  let(:product2) do
    create(:sample, molfile: build(:molfile, type: '../../rinchi/esterifica/prd_02'), collections: [collection])
  end
  let(:solvent) do
    create(:sample, molfile: build(:molfile, type: '../../rinchi/esterifica/agt_01'), collections: [collection])
  end
  let(:reaction) do
    create(:reaction, name: 'title 1', collections: [collection])
  end
  let(:serialized_reaction) do
    Entities::ReactionReportEntity.represent(
      reaction,
      current_user: user,
      detail_levels: ElementDetailLevelCalculator.new(user: user, element: reaction).detail_levels,
      serializable: true,
    )
  end
  let(:report_file) do
    tempfile = Tempfile.new(['rspec', file_extension])
    described_class.new(objs: [serialized_reaction]).create(tempfile.path)
    Roo::Spreadsheet.open(tempfile.path)
  end

  before do
    create(
      :reactions_starting_material_sample, reaction: reaction, sample: starting_material1,
                                           equivalent: 0.88, position: 1
    )
    create(
      :reactions_starting_material_sample, reaction: reaction, sample: starting_material2,
                                           equivalent: 0.88, position: 2
    )
    create(:reactions_product_sample, reaction: reaction, sample: product1, equivalent: 0.88, position: 1)
    create(:reactions_product_sample, reaction: reaction, sample: product2, equivalent: 0.88, position: 2)
    create(:reactions_solvent_sample, reaction: reaction, sample: solvent, equivalent: 0.88)
  end
end
