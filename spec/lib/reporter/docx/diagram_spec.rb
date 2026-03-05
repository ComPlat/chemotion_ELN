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
  end
end
