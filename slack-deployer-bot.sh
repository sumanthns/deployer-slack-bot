#!/bin/bash

case "$1" in 
start)
   nohup node . > /var/log/slack-deployer-bot.log &
   echo $!> /var/run/slack-deployer-bot.pid
   ;;
stop)
   kill `cat /var/run/slack-deployer-bot.pid`
   rm /var/run/slack-deployer-bot.pid
   ;;
restart)
   $0 stop
   $0 start
   ;;
status)
   if [ -e /var/run/slack-deployer-bot.pid ]; then
      echo slack-deployer-bot is running, pid=`cat /var/run/slack-deployer-bot.pid`
   else
      echo slack-deployer-bot is NOT running
      exit 1
   fi
   ;;
*)
   echo "Usage: $0 {start|stop|status|restart}"
esac

exit 0 