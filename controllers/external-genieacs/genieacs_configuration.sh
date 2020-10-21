# environment variables to configure genieacs
export GENIEACS_CWMP_SSL=TRUE
export GENIEACS_CWMP_SSL_CERT="/root/flashman/certs/cert.pem"
export GENIEACS_CWMP_SSL_KEY="/root/flashman/certs/key.pem"
export GENIEACS_CWMP_PORT=7547
export GENIEACS_CWMP_ACCESS_LOG_FILE="/dev/null"
export GENIEACS_NBI_ACCESS_LOG_FILE="/dev/null"
export GENIEACS_UI_PORT=3500
export GENIEACS_EXT_DIR="/root/flashman/controllers/external-genieacs"
export GENIEACS_RETRY_DELAY=15
export GENIEACS_MAX_CONCURRENT_REQUESTS=20000
export GENIEACS_MAX_COMMIT_ITERATIONS=64
#export GENIEACS_DEBUG_FILE="/root/debug-genie.log"
#export GENIEACS_DEBUG=TRUE