#!/bin/bash
  
echo "Este script deve rodar no diretorio do Flashman!"
read -p "Pressione Enter para continuar..."

echo "Atualizando parâmetro do GenieACS..."
sed -i 's/.*COMMIT_ITERATIONS.*/      "GENIEACS_MAX_COMMIT_ITERATIONS": 1024,/' environment.genieacs.json
cat environment.genieacs.json | grep -m 1 "COMMIT" | grep -q "1024"
if [ $? -ne 0 ]
then
  echo "Erro atualizando parãmetro! Abortando..."
  exit -1
fi
echo ""

echo "Reiniciando serviço do GenieACS..."
pm2 delete genieacs-cwmp
pm2 start environment.genieacs.json
sleep 5
pm2 status | grep -m 1 "genieacs-cwmp" | grep -q "online"
if [ $? -ne 0 ]
then
  echo "GenieACS não recarregou! Abortando..."
  exit -1
fi
echo ""

git add environment.genieacs.json
echo "Setup feito com sucesso!"
exit 0

