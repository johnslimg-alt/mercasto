#!/bin/bash

# =================================================================
# Mercasto Restore Script (Files + Database) from AWS S3
# =================================================================

if [ -z "$1" ]; then
  echo "Uso: $0 <nombre-del-archivo.tar.gz>"
  echo "Ejemplo: $0 mercasto-full-backup-2026-04-15_04-00-00.tar.gz"
  exit 1
fi

BACKUP_FILE=$1

# --- Configuración ---
S3_BUCKET="s3://your-s3-bucket-name/backups" # Debe coincidir con el script de backup
DB_USER="your_db_user"
DB_PASS="your_db_password"
DB_NAME="mercasto_db_name"
PROJECT_PATH="/var/www/mercasto"
RESTORE_DIR="/tmp/mercasto_restore"

echo "Iniciando proceso de restauración para $BACKUP_FILE..."

# 1. Crear directorio temporal limpio
rm -rf ${RESTORE_DIR}
mkdir -p ${RESTORE_DIR}

# 2. Descargar archivo desde AWS S3
echo "Descargando ${BACKUP_FILE} desde S3..."
aws s3 cp ${S3_BUCKET}/${BACKUP_FILE} ${RESTORE_DIR}/${BACKUP_FILE}
if [ $? -ne 0 ]; then
    echo "!!! Falló la descarga. Verifica el nombre del archivo y la ruta de S3."
    exit 1
fi

# 3. Extraer el archivo principal
echo "Extrayendo el archivo principal..."
tar -xzf ${RESTORE_DIR}/${BACKUP_FILE} -C ${RESTORE_DIR}

# 4. Restaurar la Base de Datos
SQL_FILE=$(find ${RESTORE_DIR} -name "database-*.sql" | head -n 1)
if [ -n "$SQL_FILE" ]; then
    echo "Restaurando la base de datos desde ${SQL_FILE}..."
    mysql -u${DB_USER} -p${DB_PASS} ${DB_NAME} < ${SQL_FILE}
    if [ $? -ne 0 ]; then
        echo "!!! Falló la restauración de la base de datos."
        exit 1
    fi
    echo "Base de datos restaurada con éxito."
else
    echo "!!! Archivo SQL no encontrado en el backup."
    exit 1
fi

# 5. Restaurar los Archivos del Proyecto
FILES_ARCHIVE=$(find ${RESTORE_DIR} -name "project-files-*.tar.gz" | head -n 1)
if [ -n "$FILES_ARCHIVE" ]; then
    echo "Restaurando archivos del proyecto en ${PROJECT_PATH}..."
    PARENT_DIR=$(dirname ${PROJECT_PATH})
    tar -xzf ${FILES_ARCHIVE} -C ${PARENT_DIR}
    if [ $? -ne 0 ]; then
        echo "!!! Falló la restauración de los archivos."
        exit 1
    fi
    echo "Archivos restaurados con éxito."
else
    echo "!!! Archivo de proyecto (.tar.gz) no encontrado."
    exit 1
fi

# 6. Limpieza
echo "Limpiando archivos temporales..."
rm -rf ${RESTORE_DIR}

echo "--------------------------------------------------------"
echo "¡Restauración de Mercasto completada con éxito!"
echo "--------------------------------------------------------"