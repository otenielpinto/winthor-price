#!/bin/bash

# Set Oracle client library path
export LD_LIBRARY_PATH=/home/$user/oracle/instantclient_21_8
export ORACLE_CLIENT_PATH=/home/$user/oracle/instantclient_21_8

# Verify the Oracle client library exists
if [ ! -f "$LD_LIBRARY_PATH/libclntsh.so" ]; then
    echo "ERROR: Oracle client library not found at $LD_LIBRARY_PATH/libclntsh.so"
    echo "Please run the install-oracle-client.sh script first."
    echo "Available files in $LD_LIBRARY_PATH:"
    ls -la $LD_LIBRARY_PATH
    exit 1
fi

echo "Starting application with Oracle client at $LD_LIBRARY_PATH"

# Start the application
npm start
