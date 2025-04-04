#!/bin/bash

# Script to install Oracle Instant Client on Linux
# This script needs to be run with sudo

INSTALL_DIR="/opt/oracle"
CLIENT_VERSION="21.8"
INSTANT_CLIENT_DIR="$INSTALL_DIR/instantclient_21_8"

# Create directory if it doesn't exist
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

echo "Downloading Oracle Instant Client..."
# Download Oracle Instant Client Basic
wget https://download.oracle.com/otn_software/linux/instantclient/218000/instantclient-basic-linux.x64-21.8.0.0.0dbru.zip
# Download Oracle Instant Client SDK
wget https://download.oracle.com/otn_software/linux/instantclient/218000/instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip

echo "Extracting Oracle Instant Client..."
unzip -o instantclient-basic-linux.x64-21.8.0.0.0dbru.zip
unzip -o instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip

# Create necessary symbolic links
cd $INSTANT_CLIENT_DIR
ln -sf libclntsh.so.21.1 libclntsh.so

# Verify the library file exists
if [ ! -f "$INSTANT_CLIENT_DIR/libclntsh.so" ]; then
    echo "WARNING: libclntsh.so not found. Checking for alternative versions..."
    # List all libclntsh files and create appropriate symlink
    LIBCLNTSH=$(find $INSTANT_CLIENT_DIR -name "libclntsh.so*" | head -1)
    if [ -n "$LIBCLNTSH" ]; then
        echo "Found library: $LIBCLNTSH"
        ln -sf $LIBCLNTSH $INSTANT_CLIENT_DIR/libclntsh.so
    else
        echo "ERROR: No libclntsh.so variant found in $INSTANT_CLIENT_DIR"
        ls -la $INSTANT_CLIENT_DIR
    fi
fi

# Configure the library path for the system
echo "$INSTANT_CLIENT_DIR" > /etc/ld.so.conf.d/oracle-instantclient.conf
ldconfig

# Set permissions to ensure all users can access the libraries
chmod -R 755 $INSTANT_CLIENT_DIR

echo "Oracle Instant Client installed successfully at $INSTANT_CLIENT_DIR"
echo "To configure your project, make sure LD_LIBRARY_PATH in your .env file points to: $INSTANT_CLIENT_DIR"

# Verify the library can be found
if [ -f "$INSTANT_CLIENT_DIR/libclntsh.so" ]; then
    echo "✓ Library file libclntsh.so confirmed to exist."
else 
    echo "⚠ WARNING: libclntsh.so still not found. Installation may be incomplete."
    echo "Available files in $INSTANT_CLIENT_DIR:"
    ls -la $INSTANT_CLIENT_DIR
fi

# Cleanup
rm -f $INSTALL_DIR/instantclient-basic-linux.x64-21.8.0.0.0dbru.zip
rm -f $INSTALL_DIR/instantclient-sdk-linux.x64-21.8.0.0.0dbru.zip

echo "Setup complete. You might need to restart your application for changes to take effect."
