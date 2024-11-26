#!/bin/bash
set -eux
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd backend
cross build --target x86_64-unknown-linux-musl --release
cp target/x86_64-unknown-linux-musl/release/althea-link-backend ../deploy/
popd
pushd frontend
npm run build
rm -rf ../deploy/frontend/
mkdir ../deploy/frontend
cp -r out/* ../deploy/frontend/
popd
pushd $DIR
if [ "$BRANCH_NAME" == "prod" ]; then
    ansible-playbook -i hosts-prod deploy.yml
else
    ansible-playbook -i hosts-test deploy.yml
fi
popd