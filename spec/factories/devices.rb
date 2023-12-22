FactoryBot.define do
  factory :device do
    sequence(:email) { |n| "device#{n}@foo.bar" }
    first_name { 'Device' }
    last_name { 'One' }
    sequence(:name_abbreviation) { "D#{SecureRandom.alphanumeric(3)}" }
    encrypted_password { 'testtest' }

    trait :file_local do
      datacollector_config do
        {
          'method' => 'filewatcherlocal',
          'method_params' => {
            'dir' => "#{Rails.root}/tmp/datacollector/#{name_abbreviation}",
            'authen' => 'password',
            'number_of_files' => 1,
          },
        }
      end
    end

    trait :file_sftp do
      datacollector_config do
        {
          'method' => 'filewatchersftp',
          'method_params' => {
            'dir' => "#{Rails.root}/tmp/datacollector/#{name_abbreviation}",
            'user' => ENV['DATACOLLECTOR_TEST_USER'].presence || 'testuser',
            'host' => '127.0.0.1',
            'authen' => 'keyfile',
            'key_name' => "#{Dir.home}/.ssh/id_test",
            'number_of_files' => 1,
          },
        }
      end
    end

    trait :file_sftp_faulty do
      datacollector_config do
        {
          'method' => 'filewatchersftp',
          'method_params' => {
            'dir' => "#{Rails.root}/tmp/datacollector/#{name_abbreviation}",
            'user' => 'dummy',
            'host' => '127.0.0.1',
            'authen' => 'keyfile',
            'key_name' => "#{Dir.home}/.ssh/id_test",
            'number_of_files' => 1,
          },
        }
      end
    end

    trait :folder_local do
      datacollector_config do
        {
          'method' => 'folderwatcherlocal',
          'method_params' => {
            'dir' => "#{Rails.root}/tmp/datacollector/#{name_abbreviation}",
            'authen' => 'password',
            'number_of_files' => 1,
          },
        }
      end
    end

    trait :folder_sftp do
      datacollector_config do
        {
          'method' => 'folderwatchersftp',
          'method_params' => {
            'dir' => "#{Rails.root}/tmp/datacollector/#{name_abbreviation}",
            'user' => ENV['DATACOLLECTOR_TEST_USER'].presence || 'testuser',
            'host' => '127.0.0.1',
            'authen' => 'keyfile',
            'key_name' => "#{Dir.home}/.ssh/id_test",
            'number_of_files' => 1,
          },
        }
      end
    end

    trait :folder_sftp_faulty do
      datacollector_config do
        {
          'method' => 'folderwatchersftp',
          'method_params' => {
            'dir' => "#{Rails.root}/tmp/datacollector/#{name_abbreviation}",
            'user' => 'dummy',
            'host' => '127.0.0.1',
            'authen' => 'keyfile',
            'key_name' => "#{Dir.home}/.ssh/id_test",
            'number_of_files' => 1,
          },
        }
      end
    end

    after(:create) do |device|
      dest = device.datacollector_config&.dig('method_params', 'dir')
      if dest.present?
        dir = if device.datacollector_config['method']&.include? 'folder'
                Pathname.new(dest).join("CU1-#{Time.now.to_i}")
              else
                dest
              end

        FileUtils.mkdir_p(dir) unless File.directory?(dir)
        FileUtils.cp(Rails.root.join('spec/fixtures/CU1-folder/CU1-abc.txt'), dir)
      end
    end
  end
end
