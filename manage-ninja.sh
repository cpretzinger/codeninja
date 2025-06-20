#!/bin/bash

# CodeNinja Docker Management Script

case "$1" in
  start)
    echo "🥷 Starting CodeNinja..."
    docker-compose up -d
    echo "✅ CodeNinja is running!"
    docker ps | grep codeninja
    ;;
  stop)
    echo "🛑 Stopping CodeNinja..."
    docker-compose down
    echo "✅ CodeNinja stopped"
    ;;
  restart)
    echo "🔄 Restarting CodeNinja..."
    docker-compose restart
    echo "✅ CodeNinja restarted"
    ;;
  logs)
    docker-compose logs -f
    ;;
  status)
    docker-compose ps
    ;;
  build)
    echo "🔨 Building CodeNinja image..."
    docker build -t codeninja:latest .
    echo "✅ Build complete"
    ;;
  shell)
    # Get container name from docker-compose
    CONTAINER=$(docker-compose ps -q | head -1)
    docker exec -it $CONTAINER sh
    ;;
  test)
    echo "🧪 Testing n8n connection..."
    docker-compose exec codeninja sh -c 'curl $N8N_URL/api/v1/workflows -H "X-N8N-API-KEY: $N8N_API_KEY"'
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status|build|shell|test}"
    exit 1
    ;;
esac
