FROM ubuntu:latest

# prepare
RUN apt-get -y update --fix-missing
RUN apt-get -y install apt-utils
RUN apt-get -y install build-essential wget git cmake nodejs --fix-missing

# install curl
RUN apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_4.x | bash

# install & configure postgres
RUN apt-get -y install postgresql-9.5 postgresql-contrib-9.5 libpq-dev
RUN /bin/bash -lc 'echo "local   all   all     trust" > /etc/postgresql/9.5/main/pg_hba.conf'
#RUN service postgresql restart
    #psql -U postgres -c "CREATE ROLE root WITH CREATEDB LOGIN SUPERUSER PASSWORD '';"

# install rmagick
RUN apt-get -y install libmagickcore-dev libmagickwand-dev

# node + npm via nvm; install npm packages
WORKDIR /tmp
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.3/install.sh | bash
COPY package.json /tmp/
COPY .nvmrc /tmp/
RUN /bin/bash -c 'source ~/.nvm/nvm.sh;\
    nvm install;\
    nvm use;\
    npm install'

# install ruby & gems
RUN gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3
RUN curl -sSL https://get.rvm.io | bash -s stable
RUN /bin/bash -lc 'rvm requirements;\
    rvm install 2.3.1;\
    gem install bundler --no-ri --no-rdoc'

COPY Gemfile* /tmp/
RUN /bin/bash -lc 'rvm use 2.3.1 && bundle install'

# configure app
EXPOSE 3000
WORKDIR /usr/src/app
COPY . /usr/src/app/
RUN cp -a /tmp/node_modules /usr/src/app/
RUN cp -a config/database.yml.example config/database.yml
RUN /bin/bash -lc 'service postgresql restart && rvm use 2.3.1 && bundle exec rake db:setup'
RUN chmod +x run.sh
CMD ./run.sh
