#!/bin/bash
cd "$(dirname "${BASH_SOURCE[0]}")/backend"
java -cp "LexiGravity.jar:sqlite-jdbc.jar:slf4j-api.jar:slf4j-simple.jar" com.lexigravity.LexiGravityServer
