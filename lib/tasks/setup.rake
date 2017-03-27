namespace :setup do
  task secret_key_dotenv: :environment do
    unless File.exists?(Rails.root.to_s + '/.env')
      system "echo \"SECRET_KEY_BASE: $(bundle exec rake secret)\" >> .env"
    end
  end
end
