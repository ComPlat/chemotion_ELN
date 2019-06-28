class ConvertAnalysisType < ActiveRecord::Migration

  CONV = [
    { kind: '1H NMR', ols: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)' },
    { kind: '13C NMR', ols: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' },
    { kind: 'Mass', ols: 'CHMO:0000470 | mass spectrometry (MS)' },
    { kind: 'EA', ols: 'CHMO:0001075 | elemental analysis (EA)' },
    { kind: 'GCMS', ols: 'CHMO:0000497 | gas chromatography-mass spectrometry (GCMS)' },
    { kind: 'HPLC', ols: 'CHMO:0001009 | high-performance liquid chromatography (HPLC)' },
    { kind: 'IR', ols: 'CHMO:0000630 | infrared absorption spectroscopy (IR)' },
    { kind: 'TLC', ols: 'CHMO:0001007 | thin-layer chromatography (TLC)' },
    { kind: 'Crystal-Structure', ols: 'CHMO:0000156 | X-ray diffraction (XRD)' },
    { kind: 'Others', ols: 'BFO:0000015 | process' }
  ]

  # there is an exception(incorrect?) data called 'Crystall-Structure', 'Crystall' with double 'l'.
  # set it as 'Crystal-Structure'
  EXCP = [
    { kind: 'Crystall-Structure', ols: 'CHMO:0000156 | X-ray diffraction (XRD)' }
  ]

  def up
    # convert
    CONV.each do |c|
      list = Container.where('extended_metadata->\'kind\' = (?) and container_type = \'analysis\' ', c[:kind])
      list.each do |rs|
        meta = rs.extended_metadata
        meta["kind"] = c[:ols]
        # use update_columns to bypass updated_at
        rs.update_columns(extended_metadata: meta)
      end
    end

    EXCP.each do |c|
      list = Container.where('extended_metadata->\'kind\' = (?) and container_type = \'analysis\' ', c[:kind])
      list.each do |rs|
        meta = rs.extended_metadata
        meta["kind"] = c[:ols]
        # use update_columns to bypass updated_at
        rs.update_columns(extended_metadata: meta)
      end
    end
  end

  def down
    # revert
    CONV.each do |c|
      list = Container.where('extended_metadata->\'kind\' = (?) and container_type = \'analysis\' ', c[:ols])
      list.each do |rs|
        meta = rs.extended_metadata
        meta["kind"] = c[:kind]
        # use update_columns to bypass updated_at
        rs.update_columns(extended_metadata: meta)
      end
    end
  end
end
