# frozen_string_literal: true

require 'rails_helper'

describe Reporter::Xlsx::ReactionList do
  let(:file_extension) { '.xlsx' }

  include_context 'Report shared declarations'
  it_behaves_like 'Rinchi Xlsx/Csv formats'

  # caxlsx defers reading image_src until Package#serialize, so the Tempfile
  # backing a product image must stay referenced (and therefore unfinalized)
  # until serialize has consumed it. Regression: an earlier version returned
  # only the path String from Reporter::Helper.mol_img_path, letting the
  # Tempfile become GC-eligible immediately and the file can be unlinked
  # before caxlsx zips it into the .xlsx output.
  describe 'image Tempfile GC lifetime' do
    let(:fake_png_tmp) do
      Tempfile.new(['fake', '.png']).tap do |tmp|
        tmp.binmode
        tmp.write("\x89PNG\r\n\x1a\n".b) # PNG magic bytes — enough for caxlsx to accept it
        tmp.close
      end
    end
    let(:fake_png_path) do
      fake_png_tmp.path
    end
    let(:fake_tmp) { instance_spy(Tempfile) }
    let(:list) { described_class.new(objs: [serialized_reaction]) }

    after do
      fake_png_tmp.close!
    end

    before do
      allow(Reporter::Helper).to receive(:mol_img_path).and_return([fake_png_path, fake_tmp])
    end

    it 'retains the image Tempfile on the instance so caxlsx can read it during serialization' do
      # If add_img_to_row had failed to retain the Tempfile, it would be
      # GC-eligible the moment mol_img_path returned. Retaining it on @img_tmps
      # guarantees it remains alive through Package#serialize, which inspects
      # image_src lazily.
      Tempfile.create(['rspec', file_extension]) do |tempfile|
        list.create(tempfile.path)
      end

      expect(list.instance_variable_get(:@img_tmps)).to include(fake_tmp)
    end

    it 'closes the image Tempfile after create finishes' do
      Tempfile.create(['rspec', file_extension]) do |tempfile|
        list.create(tempfile.path)
      end

      expect(fake_tmp).to have_received(:close!).at_least(:once)
    end
  end
end
