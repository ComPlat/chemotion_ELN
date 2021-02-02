dirname = Rails.root.join('tmp', 'datacollector')
DIR1 = dirname.join('dev1').to_s
DIR2 = dirname.join('dev2').to_s


[
  {
    name_abbreviation: 'Dv1',
    first_name: '1-Dev',
    last_name: 'Ice',
    email: 'dev1@email.de',
    profile_attributes: {
      data: {
        "method" => "filewatcherlocal",
        "method_params" => {
          "dir" => DIR1,
          "authen" => "password",
          "number_of_files" => 1
        }
      }
    }
  },
  {
    name_abbreviation: 'Dv2',
    first_name: '2-Dev',
    last_name: 'Ice',
    email: 'dev2@email.de',
    profile_attributes: {
      data: {
        "method" => "folderwatcherlocal",
        "method_params" => {
          "dir" => DIR2,
          "authen" => "password",
          "number_of_files" => 0
        }
      }
    }
  }
].each do |seed|
  pa = seed.delete(:profile_attributes)
  d = Device.find_by(seed) || Device.create(seed.merge(password: '@complat'))
  d.profile.update(pa)
end



def create_collector_folders 
  [DIR1, DIR2].each do |dir|
    FileUtils.mkdir_p(dir) unless File.directory?(dir)
  end
end

def touch_files
  create_collector_folders

  Person.pluck(:name_abbreviation).each do |na|
    # create dummy data file for Dv1 - file collection
	  file = Pathname.new(DIR1).join("#{na}-#{Time.now.to_i}")
    FileUtils.touch(file)
    
    # create dummy folder with 1 file for Dv1 - folder collection
    dir = Pathname.new(DIR2).join("#{na}-#{Time.now.to_i}")
    file = dir.join('dummy')
    FileUtils.mkdir_p(dir)
    FileUtils.touch(file)
  end
end

touch_files
