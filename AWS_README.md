aws ssm start-session \
 --target i-0ebe0f67351ba7fc6 \
 --region us-east-1 \
 --profile shreyas-cli

sudo systemctl status synthapi-api --no-pager
sudo journalctl -u synthapi-api -n 200 --no-pager
sudo docker ps -a
sudo docker logs synthapi-api
sudo cat /opt/synthapi/api.env
sudo cat /var/log/cloud-init-output.log
sudo cat /var/log/cloud-init.log

Most useful for the app right now:

sudo journalctl -u synthapi-api -n 200 --no-pager
sudo docker logs synthapi-api
