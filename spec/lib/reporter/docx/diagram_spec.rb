# frozen_string_literal: true

require 'rails_helper'

describe 'Reporter::Docx::Diagram' do
  let!(:user) { create(:user) }
  let!(:collection) { create(:collection, user: user) }

  describe 'DiagramReaction instance' do
    let(:reaction) { create(:reaction, name: 't1', collections: [collection]) }
    let(:instance) { Reporter::Docx::DiagramReaction.new(obj: reaction) }

    context 'when .generate_eps' do
      let(:diagram) { instance.generate }

      it 'returns an Sablon::Chem class' do
        expect(diagram.class).to eq(Sablon::Chem::Definition)
      end

      it 'contains a png file & a bin file' do
        expect(diagram.img.name.split('.').last).to eq('png')
        expect(diagram.ole.name.split('.').last).to eq('bin')
      end
    end
  end

  describe 'DiagramSample instance' do
    let(:sample) { create(:sample, name: 's1', collections: [collection]) }
    let(:instance) { Reporter::Docx::DiagramSample.new(obj: sample) }

    context 'when .generate_eps' do
      let(:diagram) { instance.generate }

      it 'returns an Sablon::Chem class' do
        expect(diagram.class).to eq(Sablon::Chem::Definition)
      end

      it 'contains a png file & a bin file' do
        expect(diagram.img.name.split('.').last).to eq('png')
        expect(diagram.ole.name.split('.').last).to eq('bin')
      end
    end

    describe '#img_path' do
      let(:svg_tmp) { instance_double(Tempfile, path: '/tmp/in.svg', close!: nil) }
      let(:out_tmp) { instance_double(Tempfile, path: '/tmp/out.png', close!: nil) }

      before do
        allow(instance).to receive(:load_svg_paths)
        allow(instance).to receive(:set_svg) { instance.svg_data = '<svg />' }
        allow(Reporter::Img::Conv).to receive(:data_to_svg).and_return(svg_tmp)
        allow(Reporter::Img::Conv).to receive(:ext_to_path).and_return(out_tmp)
      end

      it 'closes the output tempfile when inkscape export fails' do
        allow(Reporter::Img::Conv).to receive(:by_inkscape).and_raise('boom')

        expect { instance.img_path }.to raise_error('boom')
        expect(out_tmp).to have_received(:close!)
      end
    end
  end
end
