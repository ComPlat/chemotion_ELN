# Step for install development enviroment on ubuntu 20.04

## 1. Install nodejs:
```bash
sudo apt install nodejs
```

## 2. Install nvm:
```bash
sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
```

## 3. Change .example files:
```bash
cp Gemfile.plugin.example Gemfile.plugin

cp .ruby-gemset.example .ruby-gemset

cp .ruby-version.example .ruby-version

cp ./config/database.yml.example ./config/database.yml

cp ./config/datacollectors.yml.example ./config/datacollectors.yml

cp ./config/editors.yml.example ./config/editors.yml

cp ./config/inference.yml.example ./config/inference.yml

cp ./config/spectra.yml.example ./config/spectra.yml

cp ./config/storage.yml.example ./config/storage.yml

cp ./config/user_props.yml.example ./config/user_props.yml
```

## 4. Get installation script
```bash
curl -o chemotion_ELN_install.sh -L https://git.scc.kit.edu/complat/chemotion_ELN_server/raw/development/scripts/install_production_focal.sh

chmod 700 chemotion_ELN_install.sh

sudo ./chemotion_ELN_install.sh
```

### If got error “You need to run "nvm install v12.18.3" to install it before using it.”:
```bash
nvm install v12.18.3
```

Run again: 
```bash
sudo ./chemotion_ELN_install.sh
```

### If got error “You need to run "nvm install v12.18.3" to install it before using it.” again:
Open file “chemotion_ELN_install.sh”, find these lines:
```bash
if [ "${PART_5:-}" ]; then
  sharpi "$description"
  sudo -H -u $PROD bash -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash"
  sudo -H -u $PROD bash -c "source ~/.nvm/nvm.sh &&  nvm install $NODE_VERSION"  sudo -H -u $PROD bash -c "source ~/.nvm/nvm.sh &&  nvm use $NODE_VERSION && npm install -g npm@$NPM_VERSION"
  green "done $description\n"
else
  yellow "skip $description\n"
fi
```
and change those lines to:
```bash
#if [ "${PART_5:-}" ]; then
#  sharpi "$description"
#  sudo -H -u $PROD bash -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash"
#  sudo -H -u $PROD bash -c "source ~/.nvm/nvm.sh &&  nvm install $NODE_VERSION"  sudo -H -u $PROD bash -c "source ~/.nvm/nvm.sh &&  nvm use $NODE_VERSION && npm install -g npm@$NPM_VERSION"
#  green "done $description\n"
#else
#  yellow "skip $description\n"
#fi
```

And run again: 
```bash
sudo ./chemotion_ELN_install.sh
```

### If got error “SHKit::Runner::ExecuteError: Exception while executing as production@localhost: Connection refused - connect(2) for 127.0.0.1:22”
```bash
sudo apt-get install openssh-server
```

And run again: 
```bash
sudo ./chemotion_ELN_install.sh
```

## 5. Install the libraries:
```bash
bundle install
```

### If got error “You might have to install separate package for the ruby development environment, ruby-dev or ruby-devel for example”
```bash
sudo apt-get install ruby-full
```

## 6. Update databse:
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD ‘<your password>’;
```
Open file “./config/databse.yml”, change host in development to “localhost” and update your password that you set above.

## 7. Migrate data:
```bash
bundle exec rake db:create RAILS_ENV=development
bundle exec rake db:migrate RAILS_ENV=development
```

## 8. Run the app:
```bash
bundle exec rails s
```

### If got error “undefined method `new' for BigDecimal:Class (NoMethodError)”:
Open file “Gemfile” and add
```
gem 'bigdecimal', '1.3.5'
```
Save and run:
```bash
bundle install
```

Run app again:
```bash
bundle exec rails s
```

### If got error “Unable to run node_modules/.bin/browserify. Ensure you have installed it with npm. (BrowserifyRails::BrowserifyError)”:
```bash
npm install
```

And run app again:
```bash
bundle exec rails s
```

## 9. Update test data:
Open web browser, signup and login. 
Download and import data
```
https://bwsyncandshare.kit.edu/s/kzpd8B5XdjMQ8gw
```

Open new terminal and run:
```bash
bundle exec bin/delayed_job start
```
