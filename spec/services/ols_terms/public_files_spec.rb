# frozen_string_literal: true

require 'rails_helper'

RSpec.describe OlsTerms::PublicFiles do
  let(:dir) { Pathname.new(Dir.mktmpdir) }
  let!(:root) { OlsTerm.create!(owl_name: 'chmo', term_id: 'CHMO:1', label: 'root') }
  let!(:middle) { OlsTerm.create!(owl_name: 'chmo', term_id: 'CHMO:2', label: 'middle', parent: root) }

  before { OlsTerm.create!(owl_name: 'chmo', term_id: 'CHMO:3', label: 'leaf', parent: middle) }

  after { FileUtils.remove_entry(dir) }

  def read(name)
    JSON.parse(dir.join(name).read)['ols_terms']
  end

  describe '.write' do
    it 'writes the full and the edited tree under the given basename' do
      paths = described_class.write('chmo', dir: dir, basename: 'chmo.default')

      expect(paths).to eq [dir.join('chmo.default.json'), dir.join('chmo.default.edited.json')]
      expect(read('chmo.default.json').pluck('value')).to eq ['CHMO:1 | root']
    end

    it 'leads the edited tree with the "Recently selected" node, and only there' do
      described_class.write('chmo', dir: dir)

      expect(read('chmo.edited.json').first['title']).to eq OlsTerm::NODE_RECENTLY_SELECTED[:title]
      expect(read('chmo.json').pluck('title')).not_to include(OlsTerm::NODE_RECENTLY_SELECTED[:title])
    end

    it 'hangs an enabled term under its nearest enabled ancestor' do
      middle.update!(is_enabled: false)
      described_class.write('chmo', dir: dir)

      edited_root = read('chmo.edited.json').second
      expect(edited_root).to include('value' => 'CHMO:1 | root', 'is_enabled' => true)
      expect(edited_root['children'].pluck('value')).to eq ['CHMO:3 | leaf']
    end

    it 'turns the children of a disabled root into roots' do
      root.update!(is_enabled: false)
      described_class.write('chmo', dir: dir)

      expect(read('chmo.edited.json').drop(1).pluck('value')).to eq ['CHMO:2 | middle']
    end

    it 'keeps the term ids by default and drops them on request' do
      described_class.write('chmo', dir: dir)
      expect(read('chmo.json').first['id']).to eq root.id

      described_class.write('chmo', dir: dir, ids: false)
      tree = read('chmo.json')
      expect(tree.first).not_to have_key('id')
      expect(tree.dig(0, 'children', 0)).not_to have_key('id')
    end
  end
end
