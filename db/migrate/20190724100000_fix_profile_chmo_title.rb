class FixProfileChmoTitle < ActiveRecord::Migration
  def change
    Person.find_each do |u|
      profile = u.profile
      data = profile.data || {}
      next unless data.present?
      next unless data['chmo'].present?
      chmo = data['chmo']
      title = ''
      chmo.each do |c|
        case c['term_id'].strip
          when 'CHMO:0000593'
            title = '1H nuclear magnetic resonance spectroscopy (1H NMR)'
          when 'CHMO:0000595'
            title = '13C nuclear magnetic resonance spectroscopy (13C NMR)'
          when 'CHMO:0000470'
            title = 'mass spectrometry (MS)'
          when 'CHMO:0001075'
            title = 'elemental analysis (EA)'
          when 'CHMO:0000497'
            title= 'gas chromatography-mass spectrometry (GCMS)'
          when 'CHMO:0001009'
            title = 'high-performance liquid chromatography (HPLC)'
          when 'CHMO:0000630'
            title = 'infrared absorption spectroscopy (IR)'
          when 'CHMO:0001007'
            title = 'thin-layer chromatography (TLC)'
          when 'CHMO:0000156'
            title = 'X-ray diffraction (XRD)'
          else
            title = c['title']
        end
        c['title'] = title
      end
      data.merge!(chmo: chmo)
      u.profile.update_columns(data: data)
    end
  end
end
