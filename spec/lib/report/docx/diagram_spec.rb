# frozen_string_literal: true

require 'rails_helper'

describe 'Reporter::Docx::' do
  context 'DiagramReaction instance' do
    let(:r1) { create(:reaction, name: 't1') }
    let(:instance) { Reporter::Docx::DiagramReaction.new(obj: r1) }

    context '.generate_eps' do
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

  context 'DiagramSample instance' do
    let(:s1) { create(:sample, name: 's1') }
    let(:instance) { Reporter::Docx::DiagramSample.new(obj: s1) }

    context '.generate_eps' do
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
end
