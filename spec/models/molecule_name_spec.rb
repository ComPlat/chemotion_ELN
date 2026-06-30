# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MoleculeName, type: :model do
  describe 'name validation' do
    it 'accepts plain ASCII name' do
      mn = build(:molecule_name, name: 'water')
      expect(mn).to be_valid
    end

    it 'accepts en dash (U+2013) for alloy notation' do
      mn = build(:molecule_name, name: 'Cu–Ni')
      expect(mn).to be_valid
    end

    it 'accepts middle dot (U+00B7) for adduct notation' do
      mn = build(:molecule_name, name: 'CuSO4·5H2O')
      expect(mn).to be_valid
    end

    it 'accepts accented Latin characters' do
      mn = build(:molecule_name, name: 'Dérivate')
      expect(mn).to be_valid
    end

    it 'rejects a control character (NUL)' do
      mn = build(:molecule_name, name: "Cu\x00Ni")
      expect(mn).not_to be_valid
    end

    it 'rejects a C1 control character (U+0080)' do
      mn = build(:molecule_name, name: 'CuNi')
      expect(mn).not_to be_valid
    end

    it 'rejects a bidi right-to-left override (U+202E)' do
      mn = build(:molecule_name, name: 'safe‮name')
      expect(mn).not_to be_valid
    end

    it 'rejects a zero-width space (U+200B)' do
      mn = build(:molecule_name, name: 'Cu​Ni')
      expect(mn).not_to be_valid
    end

    it 'rejects a BOM character (U+FEFF)' do
      mn = build(:molecule_name, name: '﻿name')
      expect(mn).not_to be_valid
    end

    it 'rejects an empty name' do
      mn = build(:molecule_name, name: '')
      expect(mn).not_to be_valid
    end
  end
end
