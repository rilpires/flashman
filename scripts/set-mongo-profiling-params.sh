#!/bin/bash

echo "Este script deve rodar no diretório do Flashman!"
read -p "Pressione Enter para continuar..."

echo "Atualizando tamanho máximo do OPLog no mongo..."
OPLOG=$(mongo --eval 'db.adminCommand({replSetResizeOplog: 1, size: 990})')
echo "$OPLOG"
OK_OPLOG=$(echo "$OPLOG" | grep 'ok' | grep -o [0-9])
if [ "$OK_OPLOG" != "1" ]; then
  echo "Erro atualizando parâmetro, abortando..."
  exit 1
fi
echo ""

echo "Identificando versão do MongoDB..."
MAJOR_VER=$(mongo --eval 'db.version()' | grep -o 'MongoDB server version: [0-9]' | grep -o [0-9])
echo "$MAJOR_VER"
echo ""

if [ $MAJOR_VER -eq '4' ]; then
  echo "Atualizando limite de tempo para queries irem pro log..."
  SLOWMS=$(mongo --eval 'db.setProfilingLevel(0, { slowms: 1000 })')
  echo "$SLOWMS"
  OK_SLOWMS=$(echo "$SLOWMS" | grep 'ok' | grep -o [0-9])
  if [ "$OK_SLOWMS" != "1" ]; then
    echo "Erro atualizando parâmetro, abortando..."
    exit 1
  fi
  echo ""

  echo "Atualizando arquivo de configurações do mongo..."
  HASCONFIG=$(cat /etc/mongod.conf | grep '#operationProfiling')
  if [ "$HASCONFIG" != "" ]; then
    echo "Não existe uma config, atualizando tudo de uma vez"
    sudo sed -i 's/#operationProfiling:/operationProfiling:\n  mode: "off"\n  slowOpThresholdMs: 1000/' /etc/mongod.conf
    echo "OK"
  else
    echo "Já existe uma config, atualizando campos individualmente..."
    HASMODE=$(cat /etc/mongod.conf | grep 'mode: .*')
    if [ "$HASMODE" != "" ]; then
      echo "Existe um mode - verificando se o valor bate..."
      CURMODE=$(echo $HASMODE | cut -d '"' -f 2)
      if [ "$CURMODE" != "off" ]; then
        echo "Atualizando valor de mode..."
        sudo sed -i 's/  mode:.*/  mode: "off"/' /etc/mongod.conf
        echo "OK"
      else
        echo "Mode já está com o valor correto"
      fi
    else
      echo "Não existe um mode - adicionando valor..."
      sudo sed -i 's/operationProfiling:/operationProfiling:\n  mode: "off"/' /etc/mongod.conf
      echo "OK"
    fi
    HASSLOW=$(cat /etc/mongod.conf | grep 'slowOpThresholdMs: .*')
    if [ "$HASSLOW" != "" ]; then
      echo "Existe um slowms - verificando se o valor bate..."
      CURSLOW=$(echo $HASSLOW | cut -d ':' -f 2)
      if [ "$CURSLOW" != " 1000" ]; then
        echo "Atualizando valor de slowms..."
        sudo sed -i 's/  slowOpThresholdMs:.*/  slowOpThresholdMs: 1000/' /etc/mongod.conf
        echo "OK"
      else
        echo "Slowms já está com o valor correto"
      fi
    else
      echo "Não existe um slowms - adicionando valor..."
      sudo sed -i 's/operationProfiling:/operationProfiling:\n  slowOpThresholdMs: 1000/' /etc/mongod.conf
      echo "OK"
    fi
  fi
else
  echo "Esta versão do mongo não precisa atualizar outros parâmetros."
fi

echo "Setup feito com sucesso!"
exit 0

