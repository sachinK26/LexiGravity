#!/bin/bash
# LexiGravity Backend Build Script

echo "================================================"
echo "  LEXIGRAVITY - Build Script"
echo "================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Download SQLite JDBC if not present
if [ ! -f "sqlite-jdbc.jar" ]; then
    echo "Downloading SQLite JDBC driver..."
    curl -L -o sqlite-jdbc.jar \
        "https://github.com/xerial/sqlite-jdbc/releases/download/3.45.1.0/sqlite-jdbc-3.45.1.0.jar" \
        2>/dev/null || \
    wget -O sqlite-jdbc.jar \
        "https://github.com/xerial/sqlite-jdbc/releases/download/3.45.1.0/sqlite-jdbc-3.45.1.0.jar" \
        2>/dev/null
    if [ ! -f "sqlite-jdbc.jar" ]; then
        echo "ERROR: Could not download SQLite JDBC. Please download manually from:"
        echo "https://github.com/xerial/sqlite-jdbc/releases"
        exit 1
    fi
    echo "SQLite JDBC downloaded."
fi

# Download SLF4J if not present
if [ ! -f "slf4j-api.jar" ]; then
    echo "Downloading SLF4J API..."
    curl -L -o slf4j-api.jar "https://repo1.maven.org/maven2/org/slf4j/slf4j-api/2.0.12/slf4j-api-2.0.12.jar" 2>/dev/null
fi
if [ ! -f "slf4j-simple.jar" ]; then
    echo "Downloading SLF4J Simple..."
    curl -L -o slf4j-simple.jar "https://repo1.maven.org/maven2/org/slf4j/slf4j-simple/2.0.12/slf4j-simple-2.0.12.jar" 2>/dev/null
fi

# Create output dir
mkdir -p out/com/lexigravity
mkdir -p out/static

# Copy frontend to static resources
echo "Copying frontend files..."
cp -r ../frontend/* out/static/ 2>/dev/null || true

# Compile Java sources
echo "Compiling Java sources..."
javac -cp "sqlite-jdbc.jar:slf4j-api.jar" \
      -d out \
      src/main/java/com/lexigravity/*.java

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

echo "Compilation successful."

# Package into runnable JAR with manifest
echo "Packaging JAR..."
cd out
jar cfm ../LexiGravity.jar ../MANIFEST.MF -C . .
cd ..

if [ $? -ne 0 ]; then
    # Try without manifest
    jar cf LexiGravity-noManifest.jar -C out .
fi

echo ""
echo "================================================"
echo "  BUILD COMPLETE!"
echo "================================================"
echo ""
echo "To run the server:"
echo "  java -cp LexiGravity.jar:sqlite-jdbc.jar:slf4j-api.jar:slf4j-simple.jar com.lexigravity.LexiGravityServer"
echo ""
echo "Or use: ../run.sh"
